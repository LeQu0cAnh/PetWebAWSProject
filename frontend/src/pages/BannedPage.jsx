// src/pages/BannedPage.jsx
// Trang thông báo tài khoản bị khóa
// thêm LÝ DO BỊ KHÓA, thời gian khóa, liên hệ hỗ trợ,....

import { signOut as amplifySignOut } from 'aws-amplify/auth';
import { LogOut, ShieldOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BannedPage() {
  const { dbUser } = useAuth();

  const handleSignOut = async () => {
    try {
      await amplifySignOut();
    } catch (err) {
      console.error(err);
    }
    window.location.href = '/login';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 font-label-mono"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(147,0,10,0.15) 0%, transparent 70%)',
      }}
    >
      <div className="card p-10 border-4 border-danger max-w-lg w-full text-center flex flex-col items-center gap-6"
        style={{ boxShadow: '12px 12px 0px 0px #93000a' }}
      >
        {/* Icon */}
        <div className="w-20 h-20 border-4 border-danger flex items-center justify-center bg-danger/10 animate-pulse">
          <ShieldOff size={40} className="text-danger" />
        </div>

        {/* Status label */}
        <div className="inline-flex items-center gap-2 border border-danger bg-danger/10 px-4 py-1 text-xs text-danger font-bold uppercase">
          <AlertTriangle size={12} />
          TRẠNG THÁI: TÀI KHOẢN BỊ KHÓA
        </div>

        {/* Title */}
        <h1 className="font-display-xl text-2xl sm:text-3xl font-bold text-on-surface uppercase tracking-tighter">
          Tài Khoản Bị Đình Chỉ
        </h1>

        {/* Description */}
        <div className="font-body-md text-on-surface-variant text-base leading-relaxed w-full flex flex-col gap-3">
          <p>
            Tài khoản của bạn đã bị đình chỉ bởi quản trị viên. Bạn sẽ không thể truy cập vào bất kỳ trang nào cho đến khi tài khoản được mở lại.
          </p>
          
          <div className="border border-outline-variant bg-black/40 p-4 text-left text-xs flex flex-col gap-2">
            <div className="text-danger font-bold uppercase">Chi Tiết Đình Chỉ</div>
            <div>
              <span className="text-outline uppercase">Lý do ban: </span>
              <strong className="text-on-surface">{dbUser?.banReason || 'Không có lý do cụ thể'}</strong>
            </div>
            <div>
              <span className="text-outline uppercase">Thời hạn ban: </span>
              <strong className="text-secondary">
                {dbUser?.banExpiresAt 
                  ? new Date(dbUser.banExpiresAt).toLocaleString('vi-VN') 
                  : 'Vĩnh viễn (Permanent)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="w-full border border-outline-variant bg-black/30 p-4 text-left text-xs flex flex-col gap-2">
          <div className="text-secondary font-bold uppercase">Hỗ Trợ</div>
          <p className="text-on-surface-variant leading-relaxed">
            Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ đội ngũ quản trị hoặc gửi khiếu nại qua trang Liên Hệ để được hỗ trợ.
          </p>
        </div>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          className="btn btn-danger w-full flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          ĐĂNG XUẤT KHỎI HỆ THỐNG
        </button>
      </div>
    </div>
  );
}
