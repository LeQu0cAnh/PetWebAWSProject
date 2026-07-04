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
const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { client, TABLE_NAME } = require('./src/config/dynamodb');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Test kết nối DynamoDB
    const desc = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`✅ Kết nối DynamoDB thành công! Table: ${TABLE_NAME} (${desc.Table.TableStatus})`);

    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 PetWeb Backend đang chạy!');
      console.log(`📡 Local:   http://localhost:${PORT}`);
      console.log(`🏥 Health:  http://localhost:${PORT}/health`);
      console.log(`📚 API:     http://localhost:${PORT}/api`);
      console.log(`🗄️  DB:      DynamoDB (${TABLE_NAME})`);
      console.log('');
      console.log('Nhấn Ctrl+C để dừng server.');
    });
  } catch (error) {
    console.error('❌ Không thể khởi động server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Nhận tín hiệu SIGTERM. Đang tắt server...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Nhận tín hiệu SIGINT. Đang tắt server...');
  process.exit(0);
});
