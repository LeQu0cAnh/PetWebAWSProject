/**
 * src/routes/system.js
 */

const express = require('express');
const router = express.Router();
const { getPublicConfig, getDownloadInfo } = require('../controllers/systemController');

// Công khai - không cần auth
router.get('/config', getPublicConfig);
router.get('/download', getDownloadInfo);

module.exports = router;
