// src/lib/api.js
// Axios instance với JWT Token tự động đính kèm

import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: tự động đính kèm JWT Token ─────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session?.tokens?.idToken?.toString();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Người dùng chưa đăng nhập — không cần token???????????????
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: xử lý lỗi chung ───────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn — thông báo để frontend xử lý
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  },
);

export default api;
