// src/lib/amplify.js
// Khởi tạo AWS Amplify với Cognito configuration

import { Amplify } from 'aws-amplify';
import { I18n } from '@aws-amplify/core';

const domain = import.meta.env.VITE_COGNITO_DOMAIN;

const authConfig = {
  Cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    loginWith: {
      email: true,
      // Chỉ bật OAuth nếu domain đã được cấu hình đúng
      ...(domain && domain !== 'your-domain.auth.ap-southeast-1.amazoncognito.com' && {
        oauth: {
          domain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [`${window.location.origin}/callback`],
          redirectSignOut: [`${window.location.origin}`],
          responseType: 'code',
        },
      }),
    },
  },
};

Amplify.configure({ Auth: authConfig });

// Cấu hình ngôn ngữ Tiếng Việt cho AWS Amplify Authenticator UI
I18n.putVocabulariesForLanguage('vi', {
  'Sign In': 'ĐĂNG NHẬP',
  'Sign in': 'Đăng nhập',
  'Create Account': 'TẠO TÀI KHOẢN',
  'Create account': 'Tạo tài khoản',
  'Password': 'Mật khẩu',
  'Email': 'Email',
  'Forgot your password?': 'Quên mật khẩu?',
  'Reset Password': 'Đặt lại mật khẩu',
  'Send code': 'Gửi mã xác nhận',
  'Send Code': 'Gửi mã xác nhận',
  'Confirm Sign Up': 'Xác nhận đăng ký',
  'Confirm': 'Xác nhận',
  'Code': 'Mã xác nhận',
  'Enter your email': 'Nhập email của bạn',
  'Enter your password': 'Nhập mật khẩu của bạn',
  'Enter your code': 'Nhập mã xác nhận',
  'Sign Up': 'ĐĂNG KÝ',
  'Sign up': 'Đăng ký',
  'Back to Sign In': 'Quay lại Đăng nhập',
  'Signing in': 'Đang đăng nhập...',
  'Creating Account': 'Đang tạo tài khoản...',
  'We sent a code to': 'Chúng tôi đã gửi mã xác nhận đến',
  'Confirming': 'Đang xác nhận...',
  'Confirm Password': 'Xác nhận mật khẩu',
  'Sign In with Google': 'Đăng nhập bằng Google',
  'Sign in with Google': 'Đăng nhập bằng Google',
  'Sign Up with Google': 'Đăng ký bằng Google',
  'Sign up with Google': 'Đăng ký bằng Google',
  'Resend Code': 'Gửi lại mã',
  'Reset your Password': 'Đặt lại mật khẩu của bạn',
  'Submit': 'Gửi',
  'Password Field': 'Mật khẩu',
  'New Password': 'Mật khẩu mới',
  'Confirm New Password': 'Xác nhận mật khẩu mới',
  'Account recovery requires verified contact information.': 'Khôi phục tài khoản yêu cầu thông tin liên hệ đã xác minh.',
  'Verify': 'Xác minh',
  'Verify Contact': 'Xác minh thông tin liên hệ',
  'Skip': 'Bỏ qua',
  'UserName': 'Tên đăng nhập',
});

// Thiết lập ngôn ngữ mặc định là Tiếng Việt
I18n.setLanguage('vi');

