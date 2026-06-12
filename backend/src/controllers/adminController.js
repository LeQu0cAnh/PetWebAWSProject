/**
 * src/controllers/adminController.js
 * 
 * Controller cho các tính năng quản trị Admin.
 * Tất cả routes cần middleware requireAdmin.
 */

const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');
const { containsProfanity } = require('../middlewares/profanityFilter');

/**
 * GET /api/admin/stats
 * Thống kê tổng quan cho Dashboard.
 */
const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalPosts, pendingPosts, bannedUsers, totalComments, totalLikes] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { status: 'APPROVED' } }),
      prisma.post.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.comment.count(),
      prisma.like.count(),
    ]);

    // Recent activity: 5 bài mới nhất
    const recentPosts = await prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, content: true, status: true, createdAt: true,
        author: { select: { username: true, avatar: true } },
      },
    });

    // Recent users: 5 user mới nhất
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, email: true, avatar: true, title: true, createdAt: true },
    });

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

    const posts = await prisma.post.findMany({
      where: { status: 'PENDING' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' }, // Duyệt theo thứ tự cũ nhất trước
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    const hasMore = posts.length > take;
    if (hasMore) posts.pop();

    const postsWithImages = posts.map(post => {
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
      return {
        ...post,
        imageUrls: parsedUrls
      };
    });

    const nextCursor = hasMore ? postsWithImages[postsWithImages.length - 1]?.id : null;

    res.json({
      success: true,
      data: postsWithImages,
      pagination: { nextCursor, hasMore },
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

    const post = await prisma.post.update({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED' },
    });

    // Cộng EXP cho tác giả sau khi bài được duyệt
    const { addExpForAction } = require('./expController');
    const author = await prisma.user.findUnique({
      where: { id: post.authorId },
      select: { role: true },
    });
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

    const post = await prisma.post.update({
      where: { id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });

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
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, cognitoSub: true },
    });

    if (!targetUser) throw createError(404, 'Không tìm thấy người dùng.');

    if (targetUser.role === 'ADMIN') {
      throw createError(403, 'Không thể khóa tài khoản Admin.');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'BANNED',
        banReason: banReason || null,
        banExpiresAt: banExpiresAt ? new Date(banExpiresAt) : null,
      },
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

    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        banReason: null,
        banExpiresAt: null,
      },
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

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(role !== undefined && { role }),
        ...(title !== undefined && { title }),
      },
    });

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
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

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

    // Dùng upsert để update hoặc tạo mới nếu chưa có
    const updates = await prisma.$transaction(
      configs.map(({ key, value }) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        }),
      ),
    );

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

    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { username: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        title: true,
        totalExp: true,
        status: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
    });

    const hasMore = users.length > take;
    if (hasMore) users.pop();

    const nextCursor = hasMore ? users[users.length - 1]?.id : null;

    res.json({
      success: true,
      data: users,
      pagination: { nextCursor, hasMore },
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

    const posts = await prisma.post.findMany({
      where: { isHidden: true },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, username: true, avatar: true, email: true },
        },
      },
    });

    const hasMore = posts.length > take;
    if (hasMore) posts.pop();

    const postsWithImages = posts.map(post => {
      let parsedUrls = [];
      if (post.imageUrls) {
        try { parsedUrls = JSON.parse(post.imageUrls); } catch { parsedUrls = []; }
      } else if (post.imageUrl) {
        parsedUrls = [post.imageUrl];
      }
      return { ...post, imageUrls: parsedUrls };
    });

    const nextCursor = hasMore ? postsWithImages[postsWithImages.length - 1]?.id : null;

    res.json({
      success: true,
      data: postsWithImages,
      pagination: { nextCursor, hasMore },
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
