/**
 * src/config/prisma.js
 * 
 * Singleton Prisma Client instance.
 * Dùng chung toàn bộ ứng dụng để tránh tạo nhiều kết nối.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

module.exports = prisma;
