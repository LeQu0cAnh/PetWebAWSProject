/**
 * src/routes/posts.js
 */

const express = require('express');
const router = express.Router();
const {
  getPosts,
  createPost,
  likePost,
  deletePost,
  toggleHidePost,
} = require('../controllers/postController');
const { authenticate, optionalAuth, requireAdmin } = require('../middlewares/auth');

// ── Public / Optional Auth ────────────────────────────────────────────────────
router.get('/', optionalAuth, getPosts);                         // Lấy danh sách bài viết

// ── Cần đăng nhập ─────────────────────────────────────────────────────────────
router.post('/', authenticate, createPost);                     // Đăng bài
router.post('/:id/like', authenticate, likePost);               // Like/Unlike

// ── Chỉ Admin ─────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, requireAdmin, deletePost);           // Xóa bài
router.patch('/:id/hide', authenticate, requireAdmin, toggleHidePost);  // Ẩn/Hiện bài

module.exports = router;
