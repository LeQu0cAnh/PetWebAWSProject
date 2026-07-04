/**
 * src/controllers/expController.js
 * 
 * Logic cốt lõi của hệ thống Gamification:
 * - Đọc cấu hình EXP từ SystemConfig trong DynamoDB
 * - Kiểm tra daily cap EXP
 * - Cộng EXP vào user
 * - Kiểm tra và thăng cấp danh hiệu
 */

const db = require('../db/db');

// ── Bảng ánh xạ EXP -> Danh hiệu ─────────────────────────────────────────────
// Thứ tự từ cao đến thấp để tìm mốc đúng
// Update new exp
const TITLE_THRESHOLDS = [
  { title: 'SANG_THE',    configKey: 'title_sang_the_exp',    default: 20000 },
  { title: 'NGAN_LONG',   configKey: 'title_ngan_long_exp',   default: 14000 },
  { title: 'CHU_PHUONG',  configKey: 'title_chu_phuong_exp',  default: 9000  },
  { title: 'TU_HIEU',     configKey: 'title_tu_hieu_exp',     default: 5500  },
  { title: 'XICH_HO',     configKey: 'title_xich_ho_exp',     default: 3000  },
  { title: 'KIM_O',       configKey: 'title_kim_o_exp',       default: 1500  },
  { title: 'THUONG_LANG', configKey: 'title_thuong_lang_exp', default: 600   },
  { title: 'BACH_LOC',    configKey: 'title_bach_loc_exp',    default: 200   },
  { title: 'TAN_TINH',    configKey: null,                    default: 0     },
];

/**
 * Lấy config từ DB, trả về object key -> value (Number hoặc String).
 */
async function getConfigs(keys) {
  return await db.getConfigsByKeys(keys);
}

/**
 * Tính danh hiệu mới dựa trên totalExp và cấu hình trong DB.
 * @param {number} totalExp - Tổng EXP của user
 * @param {Object} configs - Object chứa tất cả configs (key -> value)
 * @param {string} currentRole - Role của user ('ADMIN' | 'USER')
 * @returns {string} - Tên danh hiệu (enum value)
 */
function computeTitle(totalExp, configs, currentRole) {
  // Admin luôn có danh hiệu cứng là ADMIN
  if (currentRole === 'ADMIN') return 'ADMIN';

  for (const threshold of TITLE_THRESHOLDS) {
    if (threshold.configKey === null) return threshold.title; // TAN_TINH là fallback
    
    const minExp = parseInt(configs[threshold.configKey] ?? threshold.default, 10);
    if (totalExp >= minExp) {
      return threshold.title;
    }
  }

  return 'TAN_TINH';
}

/**
 * Tính tổng EXP đã nhận trong ngày hôm nay của một user.
 * @param {string} userId - ID của user trong DB
 * @returns {number} - Tổng EXP đã nhận hôm nay
 */
async function getTodayExp(userId) {
  return await db.getTodayExpSum(userId);
}

/**
 * Xử lý việc cộng EXP cho user sau một hành động.
 * 
 * @param {string} userId - ID của user trong DB (không phải cognitoSub)
 * @param {string} action - 'LIKE' | 'COMMENT' | 'POST'
 * @param {string} currentRole - 'ADMIN' | 'USER'
 * @returns {Object} - { expAdded, newTotalExp, newTitle, leveledUp, dailyCapReached }
 */
async function addExpForAction(userId, action, currentRole) {
  // Config keys cần lấy
  const configKeys = [
    'exp_like',
    'exp_comment',
    'exp_post',
    'exp_daily_cap',
    ...TITLE_THRESHOLDS.filter((t) => t.configKey).map((t) => t.configKey),
  ];

  const configs = await getConfigs(configKeys);

  // Lấy số điểm EXP cho hành động này
  const expMap = {
    LIKE: parseInt(configs['exp_like'] ?? '5', 10),
    COMMENT: parseInt(configs['exp_comment'] ?? '10', 10),
    POST: parseInt(configs['exp_post'] ?? '20', 10),
  };

  const expToAdd = expMap[action];
  const dailyCap = parseInt(configs['exp_daily_cap'] ?? '100', 10);

  // Kiểm tra daily cap
  const todayExp = await getTodayExp(userId);
  const remainingCap = dailyCap - todayExp;

  if (remainingCap <= 0) {
    return {
      expAdded: 0,
      dailyCapReached: true,
      message: `Bạn đã đạt giới hạn EXP hôm nay (${dailyCap} EXP/ngày).`,
    };
  }

  // Số EXP thực sự được cộng (không vượt quá remaining cap)
  const actualExpAdded = Math.min(expToAdd, remainingCap);

  // Lấy user hiện tại
  const user = await db.getUserById(userId);

  const newTotalExp = user.totalExp + actualExpAdded;
  const newTitle = computeTitle(newTotalExp, configs, currentRole);
  const leveledUp = newTitle !== user.title;

  // Atomic: cộng EXP + lưu lịch sử + cập nhật danh hiệu
  await db.addExpToUser(userId, {
    totalExp: newTotalExp,
    title: newTitle,
    expAmount: actualExpAdded,
    action,
  });

  return {
    expAdded: actualExpAdded,
    newTotalExp,
    newTitle,
    leveledUp,
    dailyCapReached: false,
  };
}

module.exports = {
  addExpForAction,
  computeTitle,
  getConfigs,
  getTodayExp,
  TITLE_THRESHOLDS,
};
