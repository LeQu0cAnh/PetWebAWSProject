/**
 * src/controllers/systemController.js
 * 
 * Controller cho các API liên quan đến cấu hình hệ thống.
 * Đã chuyển từ Prisma sang DynamoDB.
 */

const db = require('../db/db');

// Các config key được phép xem công khai (không lộ config nhạy cảm)
const PUBLIC_CONFIG_KEYS = [
  'download_url_windows',
  'download_url_mac',
  'download_url_linux',
  'download_version',
  'exp_like',
  'exp_comment',
  'exp_post',
  'exp_daily_cap',
  'post_approval_mode',
  'title_bach_loc_exp',
  'title_thuong_lang_exp',
  'title_kim_o_exp',
  'title_xich_ho_exp',
  'title_tu_hieu_exp',
  'title_chu_phuong_exp',
  'title_ngan_long_exp',
  'title_sang_the_exp',
];

/**
 * GET /api/system/config
 * Lấy các cấu hình công khai (download links, EXP config, title thresholds).
 */
const getPublicConfig = async (req, res, next) => {
  try {
    const result = await db.getConfigsByKeys(PUBLIC_CONFIG_KEYS);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/system/download
 * Lấy thông tin download (shortcut API).
 */
const getDownloadInfo = async (req, res, next) => {
  try {
    const keys = [
      'download_url_windows',
      'download_url_mac',
      'download_url_linux',
      'download_version',
    ];
    const result = await db.getConfigsByKeys(keys);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicConfig, getDownloadInfo };
