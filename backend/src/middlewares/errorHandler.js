/**
 * src/middlewares/errorHandler.js
 * 
 * Global error handler middleware.
 * Bắt tất cả lỗi chưa được xử lý trong ứng dụng.
 * Đã cập nhật từ Prisma error codes sang DynamoDB errors.
 */

const errorHandler = (err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  // DynamoDB: ConditionalCheckFailedException — unique violation hoặc item đã tồn tại
  if (err.name === 'ConditionalCheckFailedException') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại (vi phạm ràng buộc unique).',
    });
  }

  // DynamoDB: TransactionCanceledException — transaction conflict
  if (err.name === 'TransactionCanceledException') {
    return res.status(409).json({
      success: false,
      message: 'Xung đột dữ liệu, vui lòng thử lại.',
    });
  }

  // DynamoDB: ResourceNotFoundException — table không tồn tại
  if (err.name === 'ResourceNotFoundException') {
    return res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống: không tìm thấy bảng dữ liệu.',
    });
  }

  // DynamoDB: ValidationException — query/update expression lỗi
  if (err.name === 'ValidationException') {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
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
