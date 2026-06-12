/**
 * src/middlewares/profanityFilter.js
 * 
 * Lọc từ ngữ không phù hợp (chửi bậy, xúc phạm).
 * Chỉ áp dụng cho bài đăng MỚI.
 * 
 * Cách hoạt động:
 * 1. Normalize text: bỏ dấu, lowercase, xử lý ký tự đặc biệt
 * 2. Kiểm tra từng từ cấm trong danh sách
 * 3. Phát hiện cả các biến thể viết tắt phổ biến
 */

// ── Danh sách từ cấm ─────────────────────────────────────────────────────────
// Tiếng Việt
const VIET_PROFANITY = [
  // Chửi bậy phổ biến
  'dit', 'dit me', 'dit ma', 'dmm', 'dcm', 'dcmm', 'dkm', 'djt',
  'địt', 'đụ', 'đéo', 'đù', 'đĩ', 'đỉ',
  'lon', 'lồn', 'buoi', 'buồi', 'cac', 'cặc', 'cu', 'cứt',
  'ngu', 'ngu vl', 'ngu vcl', 'ngu loz',
  'lol', 'loz', 'lồz', 'clgt',
  'vai lon', 'vai lol', 'vai cac',
  'cham', 'chim', 'vl', 'vcl', 'vkl', 'vclll',
  'cc', 'cl', 'ml', 'cmm', 'cms', 'cdmm',
  'dm', 'dmm', 'dml', 'dmmm',
  'me may', 'me m',
  'con cho', 'thang cho', 'do cho',
  'mat day', 'mat danh',
  'khon nan', 'do ngu', 'thang ngu',
  'do mat day', 'vo hoc',
  'do dien', 'thang dien',
  'con di', 'gai diem', 'du ma',
  'nguoi dep trai', // sarcastic insult
  'suc vat', 'do de tien', 'thang ranh',
  // Biến thể l33t speak
  'đ!t', 'd!t', 'đ1t', 'd1t',
  'l0n', 'l0z', 'l0l',
  'c4c', 'c@c',
];

// Tiếng Anh
const ENGLISH_PROFANITY = [
  'fuck', 'fck', 'fuk', 'fuq', 'fking', 'fucking', 'fcking',
  'shit', 'sh1t', 'sht', 'shyt',
  'bitch', 'b1tch', 'btch',
  'ass', 'asshole', 'a$$',
  'damn', 'dick', 'd1ck', 'dck',
  'bastard', 'whore', 'slut',
  'cunt', 'cock', 'penis', 'vagina',
  'nigger', 'nigga', 'n1gga', 'n1gger',
  'retard', 'retarded',
  'stfu', 'gtfo', 'lmao', 'wtf',
  'motherfucker', 'mf', 'mofo',
  'piss', 'crap',
];

// Gộp lại
const ALL_PROFANITY = [...VIET_PROFANITY, ...ENGLISH_PROFANITY];

// Bỏ dấu tiếng Việt, lowercase, bỏ ký tự đặc biệt
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Xử lý đ → d
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    // Thay thế ký tự leet speak phổ biến trước
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    // Bỏ ký tự đặc biệt (giữ chữ và số)
    .replace(/[^a-z0-9\s]/g, ' ')
    // Bỏ khoảng trắng thừa
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kiểm tra nội dung có chứa từ cấm không.
 * @param {string} text - Nội dung cần kiểm tra
 * @returns {Promise<{ hasProfanity: boolean, detectedWords: string[] }>}
 */
async function containsProfanity(text) {
  if (!text || typeof text !== 'string') {
    return { hasProfanity: false, detectedWords: [] };
  }

  const normalized = normalizeText(text);
  const detectedWords = [];

  // 1. Tải danh sách từ cấm từ DB
  let targetList = ALL_PROFANITY;
  try {
    const prisma = require('../config/prisma');
    const dbConfig = await prisma.systemConfig.findUnique({
      where: { key: 'profanity_words' }
    });
    if (dbConfig && dbConfig.value) {
      // Tách chuỗi phân tách bằng dấu phẩy
      const parsedList = dbConfig.value.split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      if (parsedList.length > 0) {
        targetList = parsedList;
      }
    }
  } catch (err) {
    console.warn("Lỗi tải danh sách từ cấm từ DB, sử dụng danh sách fallback:", err.message);
  }

  for (const word of targetList) {
    const normalizedWord = normalizeText(word);
    if (!normalizedWord) continue;

    // Kiểm tra word boundary để tránh false positive
    // Ví dụ: "lon" không match "salon" nhưng match "lon nay"
    const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Với từ ngắn (<=2 ký tự), chỉ match exact word
    // Với từ dài, match word boundary
    let regex;
    if (normalizedWord.length <= 2) {
      regex = new RegExp(`(?:^|\\s)${escapedWord}(?:\\s|$)`, 'i');
    } else {
      regex = new RegExp(`(?:^|\\s|[^a-z])${escapedWord}(?:\\s|[^a-z]|$)`, 'i');
    }

    if (regex.test(` ${normalized} `)) {
      detectedWords.push(word);
    }
  }

  return {
    hasProfanity: detectedWords.length > 0,
    detectedWords: [...new Set(detectedWords)], // Loại bỏ trùng
  };
}

module.exports = { containsProfanity };
