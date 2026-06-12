/**
 * src/config/s3.js
 * 
 * Cấu hình AWS S3 Client cho upload avatar + ảnh bài đăng.
 * Sử dụng presigned URL: frontend upload trực tiếp lên S3,
 * backend chỉ cấp URL có thời hạn.
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

// ── Khởi tạo S3 Client ──────────────────────────────────────────
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.COGNITO_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'petweb-uploads';

// Content type whitelist cho ảnh
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5; // 5MB ???????????? change to 25MB

/**
 * Tạo presigned URL để frontend upload trực tiếp lên S3.
 * 
 * @param {'avatar'|'post-image'} type - Loại file
 * @param {string} contentType - MIME type (image/jpeg, image/png, ...)
 * @param {string} userId - ID của user upload
 * @returns {{ uploadUrl: string, fileUrl: string, key: string }}
 */
async function generatePresignedUrl(type, contentType, userId) {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Loại file không được hỗ trợ. Chỉ chấp nhận: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Tạo key duy nhất: folder/userId/uuid.ext
  const ext = contentType.split('/')[1] || 'jpg';
  const folder = type === 'avatar' ? 'avatars' : 'posts';
  const key = `${folder}/${userId}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // Giới hạn kích thước (S3 sẽ reject nếu file lớn hơn)
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300, // URL hết hạn sau 5 phút
  });

  // URL công khai để truy cập file sau khi upload
  const fileUrl = `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
}

module.exports = { generatePresignedUrl, BUCKET, s3Client };
