/**
 * src/routes/users.js
 */

const express = require('express');
const router = express.Router();
const {
  getMe,
  getUserById,
  getUserPosts,
  updateUser,
} = require('../controllers/userController');
const { authenticate, optionalAuth } = require('../middlewares/auth');

// ── Cần đăng nhập ─────────────────────────────────────────────────────────────
router.get('/me', authenticate, getMe);             // Thông tin của chính mình
router.patch('/me', authenticate, updateUser);      // Cập nhật profile của mình (truyền id qua body hoặc param)

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, getUserById);       // Xem profile public
router.get('/:id/posts', optionalAuth, getUserPosts); // Bài viết của user

// ── Cần đăng nhập (own account only) ─────────────────────────────────────────
router.patch('/:id', authenticate, updateUser);

module.exports = router;
