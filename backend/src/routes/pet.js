/**
 * src/routes/pet.js
 *
 * Routes dành riêng cho Desktop Pet App.
 * Tất cả đều đi qua middleware `authenticate` (JWT từ Cognito).
 *
 * POST /api/pet/profile  — Lưu hồ sơ Pet lên Cloud
 * GET  /api/pet/profile  — Tải hồ sơ Pet từ Cloud
 *
 * LƯU Ý: Không sửa đổi bất kỳ route cũ nào. File này chỉ được import và
 * đăng ký thêm vào src/app.js.
 */

const express = require('express');
const router = express.Router();

const { savePetProfile, getPetProfile, chatWithPet } = require('../controllers/petController');
const { authenticate } = require('../middlewares/auth');

// ── Pet Profile & AI ──────────────────────────────────────────────────────────
router.post('/profile', authenticate, savePetProfile);   // Lưu hồ sơ Pet
router.get('/profile', authenticate, getPetProfile);     // Tải hồ sơ Pet
router.post('/chat', authenticate, chatWithPet);         // Chat với Pet

module.exports = router;
