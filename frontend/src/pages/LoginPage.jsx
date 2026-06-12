// src/pages/LoginPage.jsx
// Trang đăng nhập/đăng ký dùng Cognito Hosted UI qua Amplify UI
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// CHRONOS SHARD Amplify Theme Override
const chronosTheme = {
  name: 'chronos-shard',
  tokens: {
    colors: {
      brand: {
        primary: {
          10:  { value: '#f0fbff' },
          20:  { value: '#d0f5f8' },
          40:  { value: '#17deca' },
          60:  { value: '#17deca' },
          80:  { value: '#17deca' },
          90:  { value: '#0fa094' },
          100: { value: '#087068' },
        },
      },
    },
    components: {
      authenticator: {
        router: {
          borderWidth: { value: '2px' },
          borderColor: { value: '#17deca' },
          borderStyle: { value: 'solid' },
          boxShadow: { value: '8px 8px 0px 0px #17deca' },
          backgroundColor: { value: '#0d0d0d' },
        },
        form: {
          padding: { value: '2rem' },
        },
      },
      button: {
        primary: {
          backgroundColor: { value: '#17deca' },
          color: { value: '#000000' },
          fontWeight: { value: '700' },
          borderRadius: { value: '0px' },
          _hover: {
            backgroundColor: { value: '#0fa094' },
          },
        },
        link: {
          color: { value: '#17deca' },
        },
      },
      fieldcontrol: {
        borderRadius: { value: '0px' },
        backgroundColor: { value: '#ffffff' },
        color: { value: '#111111' },
        borderColor: { value: '#2a2a2a' },
        _focus: {
          borderColor: { value: '#17deca' },
          boxShadow: { value: '0 0 0 2px rgba(23, 222, 202, 0.3)' },
        },
      },
      field: {
        label: {
          color: { value: '#a0a0a0' },
          fontWeight: { value: '600' },
          fontSize: { value: '0.75rem' },
          letterSpacing: { value: '0.05em' },
          textTransform: { value: 'uppercase' },
        },
      },
      tabs: {
        item: {
          color: { value: '#666' },
          _active: {
            color: { value: '#17deca' },
            borderColor: { value: '#17deca' },
          },
          _hover: {
            color: { value: '#17deca' },
          },
        },
      },
    },
    radii: {
      small:  { value: '0px' },
      medium: { value: '0px' },
      large:  { value: '0px' },
      xl:     { value: '0px' },
      xxl:    { value: '0px' },
    },
  },
};

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/community', { replace: true });
  }, [isAuthenticated, navigate]);

  // Đang check trạng thái auth — hiện spinner thay vì form
  if (isLoading) {
    return (
      <div className="loading-screen" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>Đang kiểm tra đăng nhập...</span>
      </div>
    );
  }

  // Đã đăng nhập rồi — đợi useEffect redirect
  if (isAuthenticated) {
    return (
      <div className="loading-screen" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>Đang chuyển hướng...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 32,
        padding: 24,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(23,222,202,0.08) 0%, transparent 70%)',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display, monospace)',
            fontSize: '2.5rem',
            fontWeight: 900,
            color: 'var(--tertiary, #17deca)',
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          ✦ PETWEB
        </div>
        <p style={{ color: '#666', fontSize: '0.9rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          ĐĂNG NHẬP ĐỂ THAM GIA CỘNG ĐỒNG
        </p>
      </div>

      {/* Amplify Authenticator with theme */}
      <ThemeProvider theme={chronosTheme}>
        <style>{`
          /* Override Google federated button */
          [data-amplify-authenticator] [class*="federated"] button,
          [data-amplify-authenticator] button[type="button"]:has(svg) {
            background-color: #ffffff !important;
            color: #111111 !important;
            border: 2px solid #2a2a2a !important;
            border-radius: 0 !important;
            font-weight: 700 !important;
          }
          [data-amplify-authenticator] [class*="federated"] button:hover {
            background-color: #f5f5f5 !important;
            border-color: #17deca !important;
          }
          /* White background on all inputs */
          [data-amplify-authenticator] input {
            background-color: #ffffff !important;
            color: #111111 !important;
            border-radius: 0 !important;
          }
          [data-amplify-authenticator] input::placeholder {
            color: #999 !important;
          }
          /* Container background */
          [data-amplify-authenticator] [data-amplify-router] {
            background-color: #0d0d0d !important;
          }
        `}</style>
        <Authenticator
          socialProviders={['google']}
          loginMechanisms={['email']}
          signUpAttributes={['name']}
          formFields={{
            signIn: {
              username: { label: 'Email', placeholder: 'Nhập email của bạn' },
              password: { label: 'Mật khẩu', placeholder: 'Nhập mật khẩu của bạn' },
            },
            signUp: {
              name:     { label: 'Tên hiển thị', placeholder: 'Nhập tên của bạn', order: 1 },
              email:    { label: 'Email',         placeholder: 'Nhập email của bạn', order: 2 },
              password: { label: 'Mật khẩu',      placeholder: 'Mật khẩu tối thiểu 8 ký tự', order: 3 },
              confirm_password: { label: 'Xác nhận mật khẩu', placeholder: 'Nhập lại mật khẩu để xác nhận', order: 4 },
            },
            forgotPassword: {
              username: { label: 'Email', placeholder: 'Nhập email của bạn' },
            },
            confirmResetPassword: {
              confirmation_code: { label: 'Mã xác nhận', placeholder: 'Nhập mã xác nhận gồm 6 chữ số' },
              password: { label: 'Mật khẩu mới', placeholder: 'Mật khẩu mới tối thiểu 8 ký tự' },
              confirm_password: { label: 'Xác nhận mật khẩu mới', placeholder: 'Nhập lại mật khẩu mới để xác nhận' },
            },
            confirmSignUp: {
              confirmation_code: { label: 'Mã xác nhận', placeholder: 'Nhập mã xác nhận của bạn' },
            },
          }}
          components={{
            Header() {
              return (
                <div style={{
                  textAlign: 'center',
                  padding: '20px 0 8px',
                  fontFamily: 'monospace',
                  color: '#17deca',
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  ▸ CHRONOS_SHARD / AUTH_GATEWAY
                </div>
              );
            },
          }}
        />
      </ThemeProvider>
    </div>
  );
}
