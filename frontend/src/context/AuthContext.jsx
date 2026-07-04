// src/context/AuthContext.jsx
// Global Auth State — JWT Token, User Info, Role

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCurrentUser, fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import api from '../lib/api';

const AuthContext = createContext(null);

// Bảng tên hiển thị danh hiệu tiếng Việt
export const TITLE_NAMES = {
  TAN_TINH:    { name: 'Tân Tinh',          emoji: '⭐' },
  BACH_LOC:    { name: 'Bạch Lộc',          emoji: '🦌' },
  THUONG_LANG: { name: 'Thương Lang',        emoji: '🐺' },
  KIM_O:       { name: 'Kim Ô',             emoji: '🌟' },
  XICH_HO:     { name: 'Xích Hồ',           emoji: '🦊' },
  TU_HIEU:     { name: 'Tử Hiêu',           emoji: '🦅' },
  CHU_PHUONG:  { name: 'Chu Phượng',        emoji: '🔥' },
  NGAN_LONG:   { name: 'Ngân Long',         emoji: '🐉' },
  SANG_THE:    { name: 'Sáng Thế Thần Minh', emoji: '✨' },
  ADMIN:       { name: 'Admin',             emoji: '👑' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // Cognito user
  const [dbUser, setDbUser] = useState(null);      // DB user (EXP, title, etc.)
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = dbUser?.role === 'ADMIN' || user?.role === 'ADMIN';

  // ── Load user sau khi đăng nhập ─────────────────────────────────
  const loadUser = useCallback(async () => {
    // Nếu có OAuth callback params trong URL, bỏ qua getCurrentUser
    // và để Authenticator component xử lý callback
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') && params.has('state')) {
      setIsLoading(false);
      return;
    }

    // Timeout fallback: nếu sau 10s vẫn chưa xong, tắt loading để tránh spinner mãi
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    try {
      const cognitoUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session?.tokens?.idToken;

      // Lấy role từ Cognito groups
      const groups = idToken?.payload?.['cognito:groups'] || [];
      const role = groups.includes('Admin') ? 'ADMIN' : 'USER';

      setUser({
        ...cognitoUser,
        role,
        email: idToken?.payload?.email,
        groups,
      });

      // Sync với DB backend (tạo user nếu chưa có)
      try {
        const res = await api.get('/api/users/me');
        setDbUser(res.data.data);
      } catch (err) {
        console.warn('Không thể tải thông tin user từ DB:', err.message);
      }
    } catch {
      setUser(null);
      setDbUser(null);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, []);

  // ── Lắng nghe sự kiện Auth từ Amplify Hub ───────────────────────
  useEffect(() => {
    loadUser();

    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          loadUser();
          break;
        case 'signedOut':
          setUser(null);
          setDbUser(null);
          break;
        case 'tokenRefresh':
          loadUser();
          break;
        default:
          break;
      }
    });

    // Lắng nghe token expired event
    const handleExpired = () => {
      setUser(null);
      setDbUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);

    return () => {
      unsubscribe();
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, [loadUser]);

  // ── Sign Out ─────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await amplifySignOut();
      setUser(null);
      setDbUser(null);
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  // ── Refresh DB user (sau khi nhận EXP, thăng cấp) ───────────────
  const refreshDbUser = async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/users/me');
      setDbUser(res.data.data);
    } catch (err) {
      console.warn('Refresh user failed:', err.message);
    }
  };

  const value = {
    user,
    dbUser,
    isAdmin,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshDbUser,
    TITLE_NAMES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
};
