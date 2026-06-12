/**
 * src/routes/comments.js
 */

const express = require('express');
const router = express.Router();
const {
  getComments,
  createComment,
  deleteComment,
  toggleHideComment,
} = require('../controllers/commentController');
const { authenticate, optionalAuth, requireAdmin } = require('../middlewares/auth');

// ── Public ────────────────────────────────────────────────────────────────────
// Note: mount này được dùng kết hợp với posts router (nested)
// Nếu mount ở /api/posts/:id/comments thì cần mergeParams: true
const commentRouter = express.Router({ mergeParams: true });

commentRouter.get('/', optionalAuth, getComments);                             // Lấy comments của post
commentRouter.post('/', authenticate, createComment);                          // Thêm comment
commentRouter.delete('/:commentId', authenticate, requireAdmin, (req, res, next) => {
  req.params.id = req.params.commentId;
  deleteComment(req, res, next);
});
commentRouter.patch('/:commentId/hide', authenticate, requireAdmin, (req, res, next) => {
  req.params.id = req.params.commentId;
  toggleHideComment(req, res, next);
});

// Standalone comment routes (dùng cho admin inline control)
const standaloneRouter = express.Router();
standaloneRouter.delete('/:id', authenticate, requireAdmin, deleteComment);
standaloneRouter.patch('/:id/hide', authenticate, requireAdmin, toggleHideComment);

module.exports = { commentRouter, standaloneRouter };
