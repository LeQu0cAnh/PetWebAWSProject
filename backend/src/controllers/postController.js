/**
 * src/controllers/postController.js
 * 
 * Controller cho các API bài viết (Community).
 * Đã chuyển từ Prisma sang DynamoDB.
 */

const db = require('../db/db');
const { createError } = require('../middlewares/errorHandler');
const { addExpForAction, getConfigs } = require('./expController');
const { findOrCreateUser } = require('./userController');
const { containsProfanity } = require('../middlewares/profanityFilter');

/**
 * GET /api/posts
 * Lấy danh sách bài viết APPROVED (cursor-based pagination cho Infinite Scroll).
 * 
 * Query params:
 * - cursor: Opaque cursor string (để phân trang)
 * - limit: Số bài mỗi trang (tối đa 20, mặc định 10)
 */
const getPosts = async (req, res, next) => {
  try {
    const { cursor, limit = '10' } = req.query;
    const take = Math.min(parseInt(limit, 10), 20);

    const result = await db.queryApprovedPosts({ cursor, limit: take });

    // Batch get authors
    const authorIds = [...new Set(result.items.map(p => p.authorId))];
    const authorsMap = await db.batchGetUsers(authorIds);

    // Check likes nếu user đã đăng nhập — resolve DB user id từ cognitoSub
    let dbUserId = null;
    if (req.user) {
      const dbUser = await db.getUserByCognitoSub(req.user.cognitoSub);
      dbUserId = dbUser ? dbUser.id : null;
    }

    // Đánh dấu isLiked và parse imageUrls cho từng post
    const postsWithLiked = await Promise.all(result.items.map(async (post) => {
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

      // Check like status
      let isLiked = false;
      if (dbUserId) {
        isLiked = await db.checkUserLikedPost(post.id, dbUserId);
      }

      const author = authorsMap[post.authorId];

      return {
        ...post,
        isLiked,
        imageUrls: parsedUrls,
        author: author ? {
          id: author.id,
          username: author.username,
          avatar: author.avatar,
          title: author.title,
          role: author.role,
        } : null,
        _count: {
          comments: post.commentCount || 0,
        },
      };
    }));

    res.json({
      success: true,
      data: postsWithLiked,
      pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/posts
 * Đăng bài viết mới.
 * Status tự động set theo System_Config 'post_approval_mode'.
 */
const createPost = async (req, res, next) => {
  try {
    const { content, imageUrl, imageUrls } = req.body;

    if (!content || content.trim().length === 0) {
      throw createError(400, 'Nội dung bài viết không được để trống.');
    }

    if (content.length > 5000) {
      throw createError(400, 'Nội dung bài viết quá dài (tối đa 5000 ký tự).');
    }

    // Validate imageUrls (tối đa 25 hình)
    let parsedImageUrls = [];
    if (imageUrls) {
      if (!Array.isArray(imageUrls)) {
        throw createError(400, 'Danh sách ảnh không hợp lệ (phải là một mảng).');
      }
      if (imageUrls.length > 25) {
        throw createError(400, 'Bài viết tối đa chỉ được chứa 25 hình ảnh.');
      }
      parsedImageUrls = imageUrls.map(url => String(url).trim()).filter(url => url.length > 0);
    } else if (imageUrl) {
      parsedImageUrls = [imageUrl.trim()];
    }

    const primaryImageUrl = parsedImageUrls.length > 0 ? parsedImageUrls[0] : null;
    const serializedImageUrls = parsedImageUrls.length > 0 ? JSON.stringify(parsedImageUrls) : null;

    // ── Kiểm tra từ ngữ không phù hợp ──
    const profanityCheck = await containsProfanity(content);
    if (profanityCheck.hasProfanity) {
      throw createError(400,
        `Nội dung chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa lại bài viết.`
      );
    }

    // Lấy hoặc tạo user trong DB
    const dbUser = await findOrCreateUser(
      req.user.cognitoSub,
      req.user.email,
      req.user.username,
    );

    if (dbUser.status === 'BANNED') {
      throw createError(403, 'Tài khoản của bạn đã bị khóa.');
    }

    // Kiểm tra chế độ duyệt bài — cả admin cũng phải chờ duyệt trong chế độ manual
    const configs = await getConfigs(['post_approval_mode']);
    const approvalMode = configs['post_approval_mode'] || 'auto';
    const postStatus = approvalMode === 'auto' ? 'APPROVED' : 'PENDING';

    // Tạo bài viết
    const post = await db.createPost({
      authorId: dbUser.id,
      content: content.trim(),
      imageUrl: primaryImageUrl,
      imageUrls: serializedImageUrls,
      status: postStatus,
    });

    // Cộng EXP nếu bài được APPROVED ngay
    let expResult = null;
    if (postStatus === 'APPROVED') {
      expResult = await addExpForAction(dbUser.id, 'POST', req.user.role);
    }

    const responsePost = {
      ...post,
      imageUrls: parsedImageUrls,
      author: {
        id: dbUser.id,
        username: dbUser.username,
        avatar: dbUser.avatar,
        title: dbUser.title,
      },
    };

    res.status(201).json({
      success: true,
      data: responsePost,
      approvalMode,
      isPending: postStatus === 'PENDING',
      message:
        postStatus === 'PENDING'
          ? 'Bài viết của bạn đã được gửi và đang chờ Admin phê duyệt.'
          : 'Đăng bài thành công!',
      exp: expResult,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/posts/:id/like
 * Like hoặc Unlike bài viết (toggle).
 */
const likePost = async (req, res, next) => {
  try {
    const { id: postId } = req.params;

    const dbUser = await findOrCreateUser(
      req.user.cognitoSub,
      req.user.email,
      req.user.username,
    );

    if (dbUser.status === 'BANNED') {
      throw createError(403, 'Tài khoản của bạn đã bị khóa.');
    }

    // Kiểm tra bài viết tồn tại
    const post = await db.getPostById(postId);

    if (!post || post.status !== 'APPROVED' || post.isHidden) {
      throw createError(404, 'Bài viết không tồn tại.');
    }

    // Kiểm tra đã like chưa
    const existingLike = await db.getLike(postId, dbUser.id);

    let isLiked;
    let expResult = null;

    if (existingLike) {
      // ── Unlike ──
      await db.deleteLike(postId, dbUser.id);
      await db.incrementPostCounter(postId, 'likeCount', -1);
      isLiked = false;
    } else {
      // ── Like ──
      await db.createLike(postId, dbUser.id);
      await db.incrementPostCounter(postId, 'likeCount', 1);
      isLiked = true;

      // Cộng EXP cho người like (không phải tác giả bài)
      if (dbUser.id !== post.authorId) {
        expResult = await addExpForAction(dbUser.id, 'LIKE', req.user.role);
      }
    }

    const updatedPost = await db.getPostById(postId);

    res.json({
      success: true,
      data: { isLiked, likeCount: updatedPost.likeCount },
      exp: expResult,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/posts/:id
 * Xóa bài viết (chỉ Admin).
 */
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    await db.deletePostCascade(id);

    res.json({ success: true, message: 'Đã xóa bài viết.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/posts/:id/hide
 * Ẩn/Hiện bài viết (chỉ Admin).
 */
const toggleHidePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden } = req.body;

    const post = await db.updatePostHidden(id, Boolean(isHidden));

    res.json({
      success: true,
      data: post,
      message: isHidden ? 'Đã ẩn bài viết.' : 'Đã hiện bài viết.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPosts,
  createPost,
  likePost,
  deletePost,
  toggleHidePost,
};
