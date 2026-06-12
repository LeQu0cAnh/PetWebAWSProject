/**
 * lambda.js
 * 
 * ── ENTRY POINT CHO AWS LAMBDA ──
 * 
 * Wrap Express App bằng @vendia/serverless-express.
 * File này được Lambda gọi khi nhận HTTP request từ API Gateway.
 * 
 * Không cần thay đổi bất kỳ logic nào trong src/app.js.
 */

const serverlessExpress = require('@vendia/serverless-express');
const app = require('./src/app');

// Tạo handler Lambda một lần duy nhất (cached để tối ưu cold start)
const handler = serverlessExpress({ app });

module.exports = { handler };
