/**
 * src/middlewares/errorHandler.js
 * 
 * Global error handler middleware.
 * Bắt tất cả lỗi chưa được xử lý trong ứng dụng.
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  // Prisma specific errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại (vi phạm ràng buộc unique).',
      detail: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy dữ liệu.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hạn.',
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi không xác định.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Helper tạo HTTP Error
const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
