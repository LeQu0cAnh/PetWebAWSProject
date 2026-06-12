Hướng dẫn chạy PetWeb **bằng 2 cách**:
1. **Local Development**
2. **Docker**

---

## Mục Lục

- [1. Giới Thiệu Project](#1-giới-thiệu-project)
- [2. Yêu Cầu Hệ Thống](#2-yêu-cầu-hệ-thống)
- [3. Cách 1: Chạy Local](#3-cách-1-chạy-local)
- [4. Cách 2: Chạy Docker](#4-cách-2-chạy-docker)
- [5. Environmet](#5-environment)
- [6. Scripts](#6-scripts)

---

## 1. Giới Thiệu Project

**PetWeb** là một nền tảng cộng đồng pet desktop với các tính năng:
- **Frontend**: React + TypeScript + Vite (chạy trên port 5173)
- **Backend**: Express.js + Prisma + MySQL (chạy trên port 3001/5713)
- **Database**: MySQL 8.0

---

## 2. Yêu Cầu Hệ Thống

### Cách 1: Local Development
- **Node.js**: v20.x trở lên
- **npm**: v10.x trở lên
- **MySQL**: v8.0 (cài sẵn trên máy hoặc dùng Docker)

### Cách 2: Docker
- **Docker**: v24.x trở lên
- **Docker Compose**: v2.20.x trở lên

---

## 3. Cách 1: Chạy Local

### Bước 1: Cài Đặt Dependencies

```bash
# Vào thư mục backend
cd backend
npm install

# Vào thư mục frontend
cd ../frontend
npm install

# Quay lại root
cd ..
```

### Bước 2: Cài Đặt MySQL

#### Option A: Dùng Xampp

#### Option B: MySQL trong Docker
```bash
# Chạy MySQL container
docker run -d \
  --name petweb-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=petweb \
  -p 3306:3306 \
  mysql:8.0
```

### Bước 3: Cấu Hình Biến Môi Trường

#### Backend: Tạo file `.env`
```bash
cd backend
cp .env.example .env
```

**Chỉnh sửa file `backend/.env`:**
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="mysql://root:your_password@localhost:3306/petweb"

# Amazon Cognito
COGNITO_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=your_pool_id
COGNITO_CLIENT_ID=your_client_id

# Frontend URL
FRONTEND_URL=http://localhost:5173

# AWS S3
AWS_S3_BUCKET=your_bucket
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

#### Frontend: Không cần file .env
Frontend sử dụng cấu hình từ `vite.config.js` (port 5173, proxy đến backend port 3001).

### Bước 4: Thiết Lập Database

```bash
cd backend

# Tạo các bảng từ schema
npm run db:push

# Seed dữ liệu mẫu (tùy chọn)
npm run db:seed
```

### Bước 5: Chạy Backend

```bash
cd backend
npm run dev
```

**Output:**
```
PetWeb Backend đang chạy!
Local:   http://localhost:3001
Health:  http://localhost:3001/health
API:     http://localhost:3001/api
```

### Bước 6: Chạy Frontend (Terminal mới)

```bash
cd frontend
npm run dev
```

**Output:**
```
  VITE v8.0.12  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Bạn có thể truy cập:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

---

## 4. Cách 2: Chạy Docker

### Bước 1: Cấu Hình Biến Môi Trường

Tạo file `.env` tại root của project:

```bash
cp .env.vps.example .env
```

**Chỉnh sửa file `.env`:**
```env
# Database credentials
MYSQL_ROOT_PASSWORD=your_secure_password

# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Cognito
COGNITO_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=your_pool_id
COGNITO_CLIENT_ID=your_client_id
```

### Bước 2: Xây Dựng và Chạy Containers

```bash
# Từ root project
docker-compose up --build
```

**Quá trình:**
1. Build frontend (React)
2. Build backend (Node.js)
3. Khởi động MySQL
4. Khởi động PHPMyAdmin
5. Chạy migrations
6. Seed dữ liệu
7. Chạy backend

**Output:**
```
petweb-mysql      | 2026-06-12 12:00:00 0 [System] MySQL initialized successfully
petweb-phpmyadmin | AH00163: Apache/2.4.xx running
petweb-app        | PetWeb Backend đang chạy!
```

### Bạn có thể truy cập:
- **Frontend**: http://localhost:5713 (hoặc URL config trong docker-compose)
- **Backend API**: http://localhost:5713/api
- **PHPMyAdmin**: http://localhost:8081
  - Username: `root`
  - Password: `your_secure_password` (từ .env)
  - Server: `mysql`

### Bước 3: Dừng Containers

```bash
# Dừng nhưng giữ dữ liệu
docker-compose down

# Dừng và xoá toàn bộ (bao gồm dữ liệu)
docker-compose down -v
```

### Bước 4: Xem Logs

```bash
# Xem logs của tất cả services
docker-compose logs

# Xem logs của service cụ thể
docker-compose logs app
docker-compose logs mysql

# Follow logs realtime
docker-compose logs -f app
```

---

## 5. Environment

### Backend (backend/.env)

```env
# ─────────────────────────────────────────────────────────
# Server Configuration
# ─────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development              # hoặc production

# ─────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────
# Local: mysql://root:@localhost:3306/petweb
# Docker: mysql://root:password@mysql:3306/petweb
# Production: mysql://user:password@host:3306/petweb
DATABASE_URL="mysql://root:@localhost:3306/petweb"

# ─────────────────────────────────────────────────────────
# Cognito Authentication (Optional)
# ─────────────────────────────────────────────────────────
COGNITO_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=your_client_id_here

# ─────────────────────────────────────────────────────────
# CORS & Frontend
# ─────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ─────────────────────────────────────────────────────────
# AWS S3 Upload (Optional)
# ─────────────────────────────────────────────────────────
AWS_S3_BUCKET=petweb-uploads
AWS_S3_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Docker (.env)

```env
# Database credentials (dùng trong docker-compose.yml)
MYSQL_ROOT_PASSWORD=your_secure_password

# AWS S3 (tùy chọn)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

---

## 6. Scripts

### Backend Scripts

```bash
cd backend

# Phát triển (auto-reload)
npm run dev

# Chạy production
npm run start

# Prisma: Tạo migration mới
npm run db:migrate

# Prisma: Push schema đến database
npm run db:push

# Prisma: Seed dữ liệu mẫu
npm run db:seed

# Prisma: Reset database (xoá + tạo lại)
npm run db:reset

# Prisma: Mở Prisma Studio (GUI)
npm run db:studio

# Prisma: Generate client
npm run db:generate
```

### Frontend Scripts

```bash
cd frontend

# Chạy development server
npm run dev

# Build production
npm run build

# Preview build output
npm run preview
```

### Docker Commands

```bash
# Build images
docker-compose build

# Start containers
docker-compose up

# Start ở background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Run one-off command
docker-compose exec app npm run db:migrate

# SSH vào container
docker-compose exec app sh
docker-compose exec mysql mysql -uroot -p
```

---

## Bắt Đầu Nhanh

### Local
```bash
# 1. Install
cd backend && npm install && cd ../frontend && npm install && cd ..

# 2. Setup DB
cd backend
cp .env.example .env
# Chỉnh sửa DATABASE_URL
npm run db:push

# 3. Run
npm run dev  # Terminal 1

# Terminal 2
cd frontend && npm run dev
```

### Docker
```bash
# 1. Setup env
cp .env.vps.example .env

# 2. Run
docker-compose up --build
```

---