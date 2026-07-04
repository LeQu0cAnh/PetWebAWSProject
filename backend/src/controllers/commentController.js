/**
 * src/controllers/commentController.js
 * 
 * Controller cho các API bình luận.
 * Đã chuyển từ Prisma sang DynamoDB.
 */

const db = require('../db/db');
const { createError } = require('../middlewares/errorHandler');
const { addExpForAction } = require('./expController');
const { findOrCreateUser } = require('./userController');
const { containsProfanity } = require('../middlewares/profanityFilter');

/**
 * GET /api/posts/:id/comments
 * Lấy danh sách comment của một bài viết (cursor-based pagination).
 */
const getComments = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { cursor, limit = '20' } = req.query;
    const take = Math.min(parseInt(limit, 10), 50);

    const result = await db.queryCommentsByPost(postId, { cursor, limit: take });

    // Batch get authors
    const authorIds = [...new Set(result.items.map(c => c.authorId))];
    const authorsMap = await db.batchGetUsers(authorIds);

    const parsedComments = result.items.map(c => {
      let parsedUrls = [];
      if (c.imageUrls) {
        try {
          parsedUrls = JSON.parse(c.imageUrls);
        } catch (e) {
          parsedUrls = [];
        }
      }

      const author = authorsMap[c.authorId];

      return {
        ...c,
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
      data: parsedComments,
      pagination: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/posts/:id/comments
 * Thêm comment vào bài viết + cộng EXP.
 */
const createComment = async (req, res, next) => {
  try {
    const { id: postId } = req.params;
    const { content, imageUrls } = req.body;

    if (!content || content.trim().length === 0) {
      throw createError(400, 'Nội dung comment không được để trống.');
    }

    if (content.length > 2000) {
      throw createError(400, 'Comment quá dài (tối đa 2000 ký tự).');
    }

    // Validate imageUrls (tối đa 5 hình)
    let parsedImageUrls = [];
    if (imageUrls) {
      if (!Array.isArray(imageUrls)) {
        throw createError(400, 'Danh sách ảnh bình luận không hợp lệ (phải là một mảng).');
      }
      if (imageUrls.length > 5) {
        throw createError(400, 'Bình luận tối đa chỉ được chứa 5 hình ảnh.');
      }
      parsedImageUrls = imageUrls.map(url => String(url).trim()).filter(url => url.length > 0);
    }
    const serializedImageUrls = parsedImageUrls.length > 0 ? JSON.stringify(parsedImageUrls) : null;

    // Kiểm tra từ ngữ không phù hợp
    const profanityCheck = await containsProfanity(content);
    if (profanityCheck.hasProfanity) {
      throw createError(400, 'Nội dung bình luận chứa từ ngữ không phù hợp.');
    }

    // Lấy/tạo user trong DB
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

    // Tạo comment
    const comment = await db.createComment({
      postId,
      authorId: dbUser.id,
      content: content.trim(),
      imageUrls: serializedImageUrls,
    });

    // Tăng commentCount
    await db.incrementPostCounter(postId, 'commentCount', 1);

    // Cộng EXP
    const expResult = await addExpForAction(dbUser.id, 'COMMENT', req.user.role);

    const responseComment = {
      ...comment,
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
      data: responseComment,
      exp: expResult,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/comments/:id
 * Xóa comment (chỉ Admin).
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await db.getCommentById(id);
    if (!comment) throw createError(404, 'Comment không tồn tại.');

    await db.deleteCommentByKeys(comment._PK, comment._SK);

    // Giảm commentCount
    await db.incrementPostCounter(comment.postId, 'commentCount', -1);

    res.json({ success: true, message: 'Đã xóa comment.' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/comments/:id/hide
 * Ẩn/Hiện comment (chỉ Admin).
 */
const toggleHideComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isHidden } = req.body;

    const comment = await db.getCommentById(id);
    if (!comment) throw createError(404, 'Comment không tồn tại.');

    const updated = await db.updateCommentHidden(comment._PK, comment._SK, Boolean(isHidden));

    res.json({
      success: true,
      data: updated,
      message: isHidden ? 'Đã ẩn comment.' : 'Đã hiện comment.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, createComment, deleteComment, toggleHideComment };
