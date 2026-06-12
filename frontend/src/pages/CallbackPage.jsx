import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

export default function CallbackPage() {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      console.log('[Callback] OAuth params found, code:', !!code, 'state:', !!state);

      if (!code || !state) {
        navigate('/login', { replace: true });
        return;
      }

      // Trigger OAuth callback processing (exchange code for tokens)
      try {
        await fetchAuthSession();
        console.log('[Callback] fetchAuthSession completed');
      } catch (err) {
        console.log('[Callback] fetchAuthSession error:', err);
      }

      // Now get the current user (should work since OAuth exchange is done)
      for (let i = 0; i < 15; i++) {
        if (cancelled) return;
        try {
          const user = await getCurrentUser();
          console.log('[Callback] Authenticated, redirecting to /community');
          navigate('/community', { replace: true });
          return;
        } catch {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!cancelled) navigate('/login', { replace: true });
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="loading-screen" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      <span>Đang hoàn tất đăng nhập...</span>
    </div>
  );
}
