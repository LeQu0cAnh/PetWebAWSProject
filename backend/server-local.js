/**
 * server-local.js
 * 
 * ── ENTRY POINT CHO MÔI TRƯỜNG LOCAL ──
 * 
 * Import app.js và gọi app.listen() để chạy server ở local.
 * Chạy bằng: npm run dev
 */

require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/config/prisma');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test kết nối database
    await prisma.$connect();
    console.log('Kết nối Database thành công!');

    app.listen(PORT, () => {
      console.log('');
      console.log('PetWeb Backend đang chạy!');
      console.log(`Local:   http://localhost:${PORT}`);
      console.log(`Health:  http://localhost:${PORT}/health`);
      console.log(`API:     http://localhost:${PORT}/api`);
      console.log('');
      console.log('Nhấn Ctrl+C để dừng server.');
    });
  } catch (error) {
    console.error('Không thể khởi động server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nNhận tín hiệu SIGTERM. Đang tắt server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nNhận tín hiệu SIGINT. Đang tắt server...');
  await prisma.$disconnect();
  process.exit(0);
});
