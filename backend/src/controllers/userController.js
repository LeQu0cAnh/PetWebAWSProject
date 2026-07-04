/**
 * src/controllers/userController.js
 * 
 * Controller cho các API liên quan đến User.
 * Đã chuyển từ Prisma sang DynamoDB.
 */

const db = require('../db/db');
const { createError } = require('../middlewares/errorHandler');
const { containsProfanity } = require('../middlewares/profanityFilter');

// ── Helper: Check if string looks like a UUID ──────────────────────────────────
function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ── Helper: Tạo username đẹp từ email ──────────────────────────────────────────
function usernameFromEmail(email) {
  return email ? email.split('@')[0] : 'user';
}

// ── Helper: Tự động mở khóa nếu hết hạn ban ──────────────────────────────
async function checkAndExpireBan(user) {
  if (user && user.status === 'BANNED' && user.banExpiresAt && new Date(user.banExpiresAt) < new Date()) {
    return await db.updateUser(user.id, {
      status: 'ACTIVE',
      banReason: null,
      banExpiresAt: null,
    });
  }
  return user;
}

// ── Helper: Lấy user từ DB dựa trên cognitoSub ────────────────────────────────
async function findOrCreateUser(cognitoSub, email, username) {
  let user = await db.getUserByCognitoSub(cognitoSub);

  user = await checkAndExpireBan(user);

  if (!user) {
    // Tự động tạo user khi lần đầu đăng nhập
    const displayName = (username && !isUUID(username)) ? username : usernameFromEmail(email);
    
    // Đảm bảo username unique bằng cách thêm số nếu trùng
    let finalUsername = displayName;
    let attempt = 0;
    while (true) {
      const existing = await db.getUserByUsername(finalUsername);
      if (!existing) break;
      attempt++;
      finalUsername = `${displayName}${attempt}`;
    }

    user = await db.createUser({
      cognitoSub,
      email,
      username: finalUsername,
    });
  } else if (isUUID(user.username)) {
    // Fix user cũ có username UUID → đổi thành email prefix
    const newName = usernameFromEmail(email);
    let finalUsername = newName;
    let attempt = 0;
    while (true) {
      const existing = await db.getUserByUsername(finalUsername);
      if (!existing || existing.userId === user.id) break;
      attempt++;
      finalUsername = `${newName}${attempt}`;
    }
    user = await db.updateUser(user.id, {
      username: finalUsername,
      _oldUsername: user.username,
    });
  }

  return user;
}

/**
 * GET /api/users/me
 * Lấy thông tin của chính mình (tạo user nếu chưa có trong DB).
 */
const getMe = async (req, res, next) => {
  try {
    const { cognitoSub, email, username } = req.user;

    const user = await findOrCreateUser(cognitoSub, email, username);

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Lấy profile công khai của một user.
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let user = await db.getUserById(id);

    if (!user) {
      throw createError(404, 'Không tìm thấy người dùng.');
    }

    // Đếm posts
    const postCount = await db.countUserPosts(id);

    user = await checkAndExpireBan(user);

    if (user.status === 'BANNED') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản này đã bị khóa.',
        data: {
          status: 'BANNED',
          banReason: user.banReason,
          banExpiresAt: user.banExpiresAt,
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...user,
        _count: { posts: postCount },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id/posts
 * Lấy danh sách bài viết của một user (cursor-based pagination).
 */
const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit = '10' } = req.query;
    const take = Math.min(parseInt(limit, 10), 20);

    const result = await db.queryPostsByAuthor(id, { cursor, limit: take });

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
          title: author.title,
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
 * PATCH /api/users/:id
 * Cập nhật thông tin cá nhân (chỉ được sửa thông tin của chính mình).
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, bio, avatar } = req.body;

    // Tìm user trong DB
    const dbUser = await db.getUserByCognitoSub(req.user.cognitoSub);

    if (!dbUser || dbUser.id !== id) {
      throw createError(403, 'Bạn không có quyền chỉnh sửa tài khoản này.');
    }

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

    const updates = {};
    if (username !== undefined) {
      updates.username = username;
      updates._oldUsername = dbUser.username;
    }
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const updated = await db.updateUser(id, updates);

    res.json({ success: true, data: updated, message: 'Cập nhật thành công.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMe,
  getUserById,
  getUserPosts,
  updateUser,
  findOrCreateUser,
};
