/**
 * src/app.js
 * 
 * ⚡ FILE TRUNG TÂM — "Viết một nơi, chạy hai ngả" ?????? icon => vibe code à :>>>>
 * 
 * File này định nghĩa toàn bộ Express App:
 * - Middleware setup (cors, helmet, morgan, JSON parsing)
 * - Tất cả API routes
 * - Error handling
 * 
 * KHÔNG gọi app.listen() ở đây.
 * - Để chạy LOCAL: server-local.js sẽ import và gọi app.listen()
 * - Để chạy AWS Lambda: lambda.js sẽ wrap bằng @vendia/serverless-express
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const systemRoutes = require('./routes/system');
const postRoutes = require('./routes/posts');
const { commentRouter, standaloneRouter } = require('./routes/comments');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploadRoutes');
const petRoutes = require('./routes/pet');         // 🐾 Desktop Pet App routes
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
// Trên AWS Lambda, CORS được xử lý bởi API Gateway để tối ưu hiệu năng.
// Chỉ bật Express CORS khi chạy thử dưới local (không có AWS_LAMBDA_FUNCTION_NAME).
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  if (process.env.FRONTEND_URL) {
    const envOrigins = process.env.FRONTEND_URL.split(',').map(o => o.trim());
    allowedOrigins.push(...envOrigins);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
}

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/system', systemRoutes);
app.use('/api/posts', postRoutes);

// Nested: comments nằm dưới posts (GET /api/posts/:id/comments)
app.use('/api/posts/:id/comments', commentRouter);

// Standalone: admin inline actions (DELETE /api/comments/:id)
app.use('/api/comments', standaloneRouter);

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pet', petRoutes);               // 🐾 Desktop Pet App API

// ── Serve Frontend in Production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  const distPath = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/*splat', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          next();
        }
      });
    });
  }
}

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} không tồn tại.`,
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
