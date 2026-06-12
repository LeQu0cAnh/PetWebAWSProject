/**
 * src/middlewares/auth.js
 * 
 * Middleware xác thực Amazon Cognito JWT Token.
 * 
 * Cách hoạt động:
 * 1. Frontend sau khi đăng nhập với Cognito sẽ nhận được idToken hoặc accessToken.
 * 2. Frontend gửi token trong header: "Authorization: Bearer <token>"
 * 3. Middleware này verify token bằng Cognito JWKS public key.
 * 4. Sau khi verify thành công, gắn req.user = { sub, email, role, ... } vào request.
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// ── Khởi tạo JWKS Client ──────────────────────────────────────────────────────
// Tự động tải và cache public key từ Cognito
const getJwksClient = () => {
  const region = process.env.COGNITO_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!region || !userPoolId) {
    throw new Error('Missing COGNITO_REGION or COGNITO_USER_POOL_ID in .env');
  }

  return jwksClient({
    jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10 phút
  });
};

let client;

// ── Helper: Lấy signing key từ JWKS ──────────────────────────────────────────
function getSigningKey(header, callback) {
  if (!client) {
    client = getJwksClient();
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// ── Helper: Verify JWT (Promise-based) ───────────────────────────────────────
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      },
    );
  });
}

// ── Helper: Tách token từ Authorization header ────────────────────────────────
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// ── Helper: Map Cognito groups sang role ─────────────────────────────────────
function getRoleFromDecoded(decoded) {
  // Cognito lưu groups trong claim 'cognito:groups'
  const groups = decoded['cognito:groups'] || [];
  if (groups.includes('Admin')) return 'ADMIN';
  return 'USER';
}

// ── Middleware: Bắt buộc phải xác thực ───────────────────────────────────────
const authenticate = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.',
    });
  }

  try {
    const decoded = await verifyToken(token);

    // Gắn thông tin user vào request để các controller sử dụng
    req.user = {
      cognitoSub: decoded.sub,
      email: decoded.email,
      // cognito:username trả về UUID → ưu tiên email prefix
      username: decoded.email ? decoded.email.split('@')[0] : decoded['cognito:username'],
      role: getRoleFromDecoded(decoded),
      groups: decoded['cognito:groups'] || [],
      tokenUse: decoded.token_use, // 'id' hoặc 'access'
    };

    next();
  } catch (err) {
    console.error('❌ [Auth Middleware Error] Token verification failed:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ── Middleware: Tùy chọn xác thực (không bắt buộc) ───────────────────────────
// Dùng cho các route công khai nhưng cần biết user nếu đã đăng nhập
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = await verifyToken(token);
    req.user = {
      cognitoSub: decoded.sub,
      email: decoded.email,
      username: decoded.email ? decoded.email.split('@')[0] : decoded['cognito:username'],
      role: getRoleFromDecoded(decoded),
      groups: decoded['cognito:groups'] || [],
    };
  } catch {
    req.user = null; // Token lỗi nhưng không block request
  }

  next();
};

// ── Middleware: Chỉ cho phép Admin ────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập.',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện hành động này.',
    });
  }

  next();
};

module.exports = { authenticate, optionalAuth, requireAdmin };
