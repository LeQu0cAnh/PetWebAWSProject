/**
 * src/controllers/postController.js
 * 
 * Controller cho các API bài viết (Community).
 */

const prisma = require('../config/prisma');
const { createError } = require('../middlewares/errorHandler');
const { addExpForAction, getConfigs } = require('./expController');
const { findOrCreateUser } = require('./userController');
const { containsProfanity } = require('../middlewares/profanityFilter');

/**
 * GET /api/posts
 * Lấy danh sách bài viết APPROVED (cursor-based pagination cho Infinite Scroll).
 * 
 * Query params:
 * - cursor: ID của bài viết cuối cùng (để phân trang)
 * - limit: Số bài mỗi trang (tối đa 20, mặc định 10)
 */
const getPosts = async (req, res, next) => {
  try {
    const { cursor, limit = '10' } = req.query;
    const take = Math.min(parseInt(limit, 10), 20);

    const posts = await prisma.post.findMany({
      where: {
        status: 'APPROVED',
        isHidden: false,
      },
      take: take + 1, // Lấy thêm 1 để check hasMore
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            title: true,
            role: true,
          },
        },
        // Kiểm tra xem user hiện tại đã like chưa (nếu có user)
        likes: req.user
          ? {
              where: { userId: req.user._dbId },
              select: { id: true },
            }
          : false,
        _count: {
          select: { comments: true },
        },
      },
    });

    const hasMore = posts.length > take;
    if (hasMore) posts.pop();

    // Đánh dấu isLiked và parse imageUrls cho từng post
    const postsWithLiked = posts.map((post) => {
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
        isLiked: post.likes ? post.likes.length > 0 : false,
        likes: undefined, // Không trả về mảng likes thô
        imageUrls: parsedUrls,
      };
    });

    const nextCursor = hasMore ? postsWithLiked[postsWithLiked.length - 1]?.id : null;

    res.json({
      success: true,
      data: postsWithLiked,
      pagination: { nextCursor, hasMore },
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
    const post = await prisma.post.create({
      data: {
        authorId: dbUser.id,
        content: content.trim(),
        imageUrl: primaryImageUrl,
        imageUrls: serializedImageUrls,
        status: postStatus,
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
    });

    // Cộng EXP nếu bài được APPROVED ngay
    let expResult = null;
    if (postStatus === 'APPROVED') {
      expResult = await addExpForAction(dbUser.id, 'POST', req.user.role);
    }

    const responsePost = {
      ...post,
      imageUrls: parsedImageUrls
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
    const post = await prisma.post.findUnique({
      where: { id: postId, status: 'APPROVED', isHidden: false },
    });

    if (!post) {
      throw createError(404, 'Bài viết không tồn tại.');
    }

    // Kiểm tra đã like chưa
    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId: dbUser.id } },
    });

    let isLiked;
    let expResult = null;

    if (existingLike) {
      // ── Unlike ──
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existingLike.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      isLiked = false;
    } else {
      // ── Like ──
      await prisma.$transaction([
        prisma.like.create({ data: { postId, userId: dbUser.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      isLiked = true;

      // Cộng EXP cho người like (không phải tác giả bài)
      if (dbUser.id !== post.authorId) {
        expResult = await addExpForAction(dbUser.id, 'LIKE', req.user.role);
      }
    }

    const updatedPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });

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

    await prisma.post.delete({ where: { id } });

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

    const post = await prisma.post.update({
      where: { id },
      data: { isHidden: Boolean(isHidden) },
    });

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
