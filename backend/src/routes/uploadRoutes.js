/**
 * src/routes/uploadRoutes.js
 * 
 * API upload file lên S3 qua presigned URL.
 * Frontend sẽ:
 * 1. Gọi GET /api/upload/presigned để lấy URL
 * 2. PUT file trực tiếp lên S3 bằng URL đó
 * 3. Dùng fileUrl trả về để lưu vào DB
 */

const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { generatePresignedUrl } = require('../config/s3');

const router = Router();

/**
 * GET /api/upload/presigned
 * Tạo presigned URL để upload file lên S3.
 * 
 * Query params:
 * - type: 'avatar' | 'post-image'
 * - contentType: MIME type (image/jpeg, image/png, ...)
 */
router.get('/presigned', authenticate, async (req, res, next) => {
  try {
    const { type, contentType } = req.query;

    if (!type || !['avatar', 'post-image'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại upload không hợp lệ. Chỉ chấp nhận: avatar, post-image',
      });
    }

    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu contentType.',
      });
    }

    // Lấy userId từ DB
    const prisma = require('../config/prisma');
    const { findOrCreateUser } = require('../controllers/userController');
    const dbUser = await findOrCreateUser(
      req.user.cognitoSub,
      req.user.email,
      req.user.username,
    );

    const result = await generatePresignedUrl(type, contentType, dbUser.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err.message?.includes('Loại file không được hỗ trợ')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
});

module.exports = router;
