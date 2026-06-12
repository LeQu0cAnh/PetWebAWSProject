/**
 * src/routes/admin.js
 * 
 * Tất cả routes cần authenticate + requireAdmin.
 */

const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

// Áp dụng auth middleware cho toàn bộ /api/admin/*
router.use(authenticate, requireAdmin);

// ── Dashboard stats ──────────────────────────────────────────────────────────────────
router.get('/stats', getStats);                      // Thống kê tổng quan

// ── Quản lý bài viết ──────────────────────────────────────────────────────────
router.get('/posts/pending', getPendingPosts);        // Bài chờ duyệt
router.get('/posts/hidden', getHiddenPosts);           // Bài đang bị ẩn
router.patch('/posts/:id/approve', approvePost);      // Phê duyệt
router.patch('/posts/:id/reject', rejectPost);        // Từ chối

// ── Quản lý người dùng ────────────────────────────────────────────────────────
router.get('/users', getAllUsers);                    // Danh sách tất cả users
router.post('/users/:id/ban', banUser);               // Khóa tài khoản
router.post('/users/:id/unban', unbanUser);           // Mở khóa
router.patch('/users/:id', adminEditUser);            // Chỉnh sửa thông tin user

// ── Cấu hình hệ thống ─────────────────────────────────────────────────────────
router.get('/config', getAllConfigs);                 // Lấy toàn bộ config
router.patch('/config', updateConfigs);              // Cập nhật configs

module.exports = router;
