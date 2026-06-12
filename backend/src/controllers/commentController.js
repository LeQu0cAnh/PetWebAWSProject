/**
 * src/controllers/commentController.js
 * 
 * Controller cho các API bình luận.
 */

const prisma = require('../config/prisma');
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

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        isHidden: false,
      },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            title: true,
          },
        },
      },
    });

    const hasMore = comments.length > take;
    if (hasMore) comments.pop();

    const parsedComments = comments.map(c => {
      let parsedUrls = [];
      if (c.imageUrls) {
        try {
          parsedUrls = JSON.parse(c.imageUrls);
        } catch (e) {
          parsedUrls = [];
        }
      }
      return {
        ...c,
        imageUrls: parsedUrls
      };
    });

    const nextCursor = hasMore ? comments[comments.length - 1]?.id : null;

    res.json({
      success: true,
      data: parsedComments,
      pagination: { nextCursor, hasMore },
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
    const post = await prisma.post.findUnique({
      where: { id: postId, status: 'APPROVED', isHidden: false },
    });

    if (!post) {
      throw createError(404, 'Bài viết không tồn tại.');
    }

    // Tạo comment + tăng commentCount
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorId: dbUser.id,
          content: content.trim(),
          imageUrls: serializedImageUrls,
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              title: true,
            },
          },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Cộng EXP
    const expResult = await addExpForAction(dbUser.id, 'COMMENT', req.user.role);

    const responseComment = {
      ...comment,
      imageUrls: parsedImageUrls
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

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw createError(404, 'Comment không tồn tại.');

    await prisma.$transaction([
      prisma.comment.delete({ where: { id } }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

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

    const comment = await prisma.comment.update({
      where: { id },
      data: { isHidden: Boolean(isHidden) },
    });

    res.json({
      success: true,
      data: comment,
      message: isHidden ? 'Đã ẩn comment.' : 'Đã hiện comment.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getComments, createComment, deleteComment, toggleHideComment };
