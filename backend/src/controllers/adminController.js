/**
 * src/controllers/adminController.js
 * 
 * Controller cho các tính năng quản trị Admin.
 * Tất cả routes cần middleware requireAdmin.
 * Đã chuyển từ Prisma sang DynamoDB.
 */

const db = require('../db/db');
const { createError } = require('../middlewares/errorHandler');
const { containsProfanity } = require('../middlewares/profanityFilter');

/**
 * GET /api/admin/stats
 * Thống kê tổng quan cho Dashboard.
 */
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalPosts, pendingPosts, bannedUsers, totalComments, totalLikes] = await Promise.all([
      db.countByEntityType('User'),
      db.countByEntityType('Post', item => item.status === 'APPROVED'),
      db.countByEntityType('Post', item => item.status === 'PENDING'),
      db.countByEntityType('User', item => item.status === 'BANNED'),
      db.countByEntityType('Comment'),
      db.countByEntityType('Like'),
    ]);

    // Recent activity: 5 bài mới nhất
    const recentPostsRaw = await db.getRecentPosts(5);
    const recentUsersRaw = await db.getRecentUsers(5);

    // Fetch authors for recent posts
    const authorIds = [...new Set(recentPostsRaw.map(p => p.authorId))];
    const authorsMap = await db.batchGetUsers(authorIds);

    const recentPosts = recentPostsRaw.map(post => ({
      id: post.id,
      content: post.content,
      status: post.status,
      createdAt: post.createdAt,
      author: authorsMap[post.authorId] ? {
        username: authorsMap[post.authorId].username,
        avatar: authorsMap[post.authorId].avatar,
      } : null,
    }));

    const recentUsers = recentUsersRaw.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      title: user.title,
      createdAt: user.createdAt,
    }));

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPosts,
        pendingPosts,
        bannedUsers,
        totalComments,
        totalLikes,
        recentPosts,
        recentUsers,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/posts/pending
 * Lấy danh sách bài viết đang chờ duyệt (PENDING).
 */
const getPendingPosts = async (req, res, next) => {
  try {
    const { cursor, limit = '10' } = req.query;
    const take = Math.min(parseInt(limit, 10), 20);

    const result = await db.queryPendingPosts({ cursor, limit: take });

    // Batch get authors
    const authorIds = [...new Set(result.items.map(p => p.authorId))];
    const authorsMap = await db.batchGetUsers(authorIds);

    const postsWithImages = result.items.map(post => {
      let parsedUrls = [];
      if (post.imageUrls) {
        try {
          parsedUrls = JSON.parse(post.imageUrls);
        } catch (e) {
          parsedUrls = post.imageUrl ? [post.imageUrl] : [];
        }
      } else if (post.imageUrl) {
        parsedUrls = [post.imageUrl];
      }

      const author = authorsMap[post.authorId];
      return {
        ...post,
        imageUrls: parsedUrls,
        author: author ? {
          id: author.id,
          username: author.username,
          avatar: author.avatar,
          email: author.email,
        } : null,
      };
    });

    res.json({
      success: true,
      data: postsWithImages,
      pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/posts/:id/approve
 * Phê duyệt bài viết PENDING.
 */
const approvePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await db.updatePostStatus(id, 'APPROVED');

    // Cộng EXP cho tác giả sau khi bài được duyệt
    const { addExpForAction } = require('./expController');
    const author = await db.getUserById(post.authorId);
    await addExpForAction(post.authorId, 'POST', author?.role || 'USER');

    res.json({
      success: true,
      data: post,
      message: 'Đã phê duyệt bài viết.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/posts/:id/reject
 * Từ chối bài viết PENDING.
 */
const rejectPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await db.updatePostStatus(id, 'REJECTED');

    res.json({
      success: true,
      data: post,
      message: 'Đã từ chối bài viết.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/users/:id/ban
 * Khóa tài khoản user.
 */
const banUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { banReason, banExpiresAt } = req.body;

    // Không cho phép ban chính mình hoặc ban Admin khác
    const targetUser = await db.getUserById(id);

    if (!targetUser) throw createError(404, 'Không tìm thấy người dùng.');

    if (targetUser.role === 'ADMIN') {
      throw createError(403, 'Không thể khóa tài khoản Admin.');
    }

    const user = await db.updateUser(id, {
      status: 'BANNED',
      banReason: banReason || null,
      banExpiresAt: banExpiresAt ? new Date(banExpiresAt).toISOString() : null,
    });

    res.json({
      success: true,
      data: user,
      message: 'Đã khóa tài khoản.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/users/:id/unban
 * Mở khóa tài khoản user.
 */
const unbanUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await db.updateUser(id, {
      status: 'ACTIVE',
      banReason: null,
      banExpiresAt: null,
    });

    res.json({
      success: true,
      data: user,
      message: 'Đã mở khóa tài khoản.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id
 * Admin chỉnh sửa thông tin user.
 */
const adminEditUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, bio, avatar, role, title } = req.body;

    // Kiểm tra từ ngữ không phù hợp
    if (bio && typeof bio === 'string') {
      const profanityCheck = await containsProfanity(bio);
      if (profanityCheck.hasProfanity) {
        throw createError(400, 'Nội dung giới thiệu chứa từ ngữ không phù hợp.');
      }
    }
    if (username && typeof username === 'string') {
      const profanityCheck = await containsProfanity(username);
      if (profanityCheck.hasProfanity) {
        throw createError(400, 'Tên hiển thị chứa từ ngữ không phù hợp.');
      }
    }

    // Lấy user hiện tại để có oldUsername
    const currentUser = await db.getUserById(id);

    const updates = {};
    if (username !== undefined) {
      updates.username = username;
      if (currentUser) updates._oldUsername = currentUser.username;
    }
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;
    if (role !== undefined) updates.role = role;
    if (title !== undefined) updates.title = title;

    const user = await db.updateUser(id, updates);

    res.json({
      success: true,
      data: user,
      message: 'Đã cập nhật thông tin người dùng.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/config
 * Lấy toàn bộ System_Configs (Admin only).
 */
const getAllConfigs = async (req, res, next) => {
  try {
    const configs = await db.getAllConfigs();

    res.json({ success: true, data: configs });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/config
 * Cập nhật nhiều System_Configs cùng lúc.
 * Body: { configs: [{ key: string, value: string }] }
 */
const updateConfigs = async (req, res, next) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      throw createError(400, 'Dữ liệu cấu hình không hợp lệ.');
    }

    // Upsert từng config (preserve description)
    const updates = [];
    for (const { key, value } of configs) {
      const result = await db.upsertConfigPreserveDescription(key, value);
      updates.push(result);
    }

    res.json({
      success: true,
      data: updates,
      message: `Đã cập nhật ${updates.length} cấu hình.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả users (Admin only).
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { cursor, limit = '20', search } = req.query;
    const take = Math.min(parseInt(limit, 10), 50);

    const result = await db.queryAllUsers({ cursor, limit: take, search });

    // Count posts for each user
    const usersWithCount = await Promise.all(result.items.map(async (user) => {
      const postCount = await db.countUserPosts(user.id);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        title: user.title,
        totalExp: user.totalExp,
        status: user.status,
        createdAt: user.createdAt,
        _count: { posts: postCount },
      };
    }));

    res.json({
      success: true,
      data: usersWithCount,
      pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    });
  } catch (err) {
    next(err);
  }
};


/**
 * GET /api/admin/posts/hidden
 * Lấy danh sách bài viết đang bị ẩn (isHidden = true).
 */
const getHiddenPosts = async (req, res, next) => {
  try {
    const { cursor, limit = '20' } = req.query;
    const take = Math.min(parseInt(limit, 10), 50);

    const result = await db.queryHiddenPosts({ cursor, limit: take });

    // Batch get authors
    const authorIds = [...new Set(result.items.map(p => p.authorId))];
    const authorsMap = await db.batchGetUsers(authorIds);

    const postsWithImages = result.items.map(post => {
      let parsedUrls = [];
      if (post.imageUrls) {
        try { parsedUrls = JSON.parse(post.imageUrls); } catch { parsedUrls = []; }
      } else if (post.imageUrl) {
        parsedUrls = [post.imageUrl];
      }

      const author = authorsMap[post.authorId];
      return {
        ...post,
        imageUrls: parsedUrls,
        author: author ? {
          id: author.id,
          username: author.username,
          avatar: author.avatar,
          email: author.email,
        } : null,
      };
    });

    res.json({
      success: true,
      data: postsWithImages,
      pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getPendingPosts,
  getHiddenPosts,
  approvePost,
  rejectPost,
  banUser,
  unbanUser,
  adminEditUser,
  getAllConfigs,
  updateConfigs,
  getAllUsers,
};
