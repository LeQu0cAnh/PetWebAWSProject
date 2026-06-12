// src/App.jsx
// Root component — Routing, Providers, Layout

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Lazy load pages
const HomePage      = lazy(() => import('./pages/HomePage'));
const DownloadPage  = lazy(() => import('./pages/DownloadPage'));
const GuidePage     = lazy(() => import('./pages/GuidePage'));
const PetInfoPage   = lazy(() => import('./pages/PetInfoPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ContactPage   = lazy(() => import('./pages/ContactPage'));
const ProfilePage   = lazy(() => import('./pages/ProfilePage'));
const AdminPage     = lazy(() => import('./pages/AdminPage'));
const LoginPage     = lazy(() => import('./pages/LoginPage'));
const BannedPage    = lazy(() => import('./pages/BannedPage'));

// Loading fallback
function PageLoader() {
  return (
    <div className="loading-screen" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
      <span>Đang tải...</span>
    </div>
  );
}

// Protected route wrapper — also redirects banned users
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, dbUser } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (dbUser?.status === 'BANNED') return <Navigate to="/banned" replace />;
  return children;
}

// Admin route wrapper
function AdminRoute({ children }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// Banned guard — if user is banned, render BannedPage instead of Navbar layout
function BannedGuard({ children }) {
  const { isAuthenticated, isLoading, dbUser } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated && dbUser?.status === 'BANNED') {
    return (
      <Suspense fallback={<PageLoader />}>
        <BannedPage />
      </Suspense>
    );
  }
  return children;
}

function AppContent() {
  return (
    <BannedGuard>
      <div className="app-container">
        <Navbar />
        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"          element={<HomePage />} />
              <Route path="/download"  element={<DownloadPage />} />
              <Route path="/guide"     element={<GuidePage />} />
              <Route path="/pet-info"  element={<PetInfoPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/contact"   element={<ContactPage />} />
              <Route path="/login"     element={<LoginPage />} />
              <Route path="/callback"  element={<LoginPage />} />
              <Route path="/banned"    element={<BannedPage />} />
              <Route path="/user/:id"  element={<ProfilePage />} />
              <Route path="/admin"     element={
                <AdminRoute><AdminPage /></AdminRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
          }}
        />
      </div>
    </BannedGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
