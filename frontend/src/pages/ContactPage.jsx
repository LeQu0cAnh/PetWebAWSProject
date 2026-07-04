// src/pages/ContactPage.jsx
// Trang Liên Hệ & Donate — Phong cách Cyberpunk / Brutalist (Vietnamese)

import { Heart, Landmark, Send, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import qrNganHang from '../assets/qr-nganhang.jpg';

const MEMBERS = [
  {
    name: 'Lê Quốc Anh',
    role: 'Co-Founder / AWS Solutions Architect & Tester',
    description: 'Thiết kế kiến trúc hệ thống AWS và thực hiện kiểm thử toàn diện hệ thống.',
    initial: 'SyK',
    color: '#17deca', // Neon Teal
  },
  {
    name: 'Lê Tấn Lộc',
    role: 'Co-Founder / Full-Stack & Serverless Engineer',
    description: 'Thiết kế giao diện web, phát triển Lambda backend và chịu trách nhiệm deploy hệ thống lên AWS.',
    initial: 'TL',
    color: '#dab9ff', // Neon Purple
  },
  {
    name: 'Vũ Thị Thanh Thảo',
    role: 'QA Engineer / System Security Specialist',
    description: 'Kiểm thử chất lượng phần mềm (Tester) và chịu trách nhiệm đảm bảo bảo mật hệ thống.',
    initial: 'TT',
    color: '#d4a017', // Gold
  },
  {
    name: 'Huỳnh Quốc Đại',
    role: 'Unity Client Developer / Character Modeler',
    description: 'Phát triển ứng dụng client bằng Unity và thiết kế mô hình (model) nhân vật.',
    initial: 'EUA',
    color: '#ef4444', // Red
  },
  {
    name: 'Bạch Thế Bình',
    role: 'Prototype Developer / Content Creator',
    description: 'Xây dựng và hoàn thiện bản thử nghiệm đầu tiên, chịu trách nhiệm viết blog dự án.',
    initial: 'TB',
    color: '#3b82f6', // Blue
  },
];


export default function ContactPage() {
  const handleCopy = (text, message) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  return (
    <div className="relative min-h-screen pt-20 pb-32 font-label-mono text-sm">
      <div className="scanline" />
      <div className="h-5 pointer-events-none"></div>
      <div className="page-content relative z-10">
        {/* Header Console */}
        <div className="relative mb-12">
          <h1 className="font-display-xl text-3xl sm:text-4xl font-bold uppercase tracking-tighter text-on-surface">
            BAN ĐIỀU HÀNH & <span className="text-tertiary">DONATE SUPPORT</span>
          </h1>
          <div className="text-[9px] text-outline opacity-70 leading-normal mt-1">
            // HỒ SƠ NHÂN SỰ VÀ CỔNG THÔNG TIN ỦNG HỘ DỰ ÁN AI ASSISTANT
          </div>
          <div className="w-full h-1 bg-on-surface mt-3" />
          <div className="w-1/2 h-3 bg-tertiary mt-1 opacity-20" />
        </div>

        {/* ── SECTION: TEAM MEMBERS ── */}
        <div className="h-5 pointer-events-none"></div>
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-6 text-secondary uppercase font-bold tracking-wider">
            <span>✦</span> ĐỘI NGŨ PHÁT TRIỂN / DEVELOPMENT CORE
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {MEMBERS.map((member, index) => (
              <div
                key={member.name}
                className="card p-6 flex flex-col justify-between items-center text-center rotate-[0.5deg] hover:rotate-0 transition-all border-2 border-black"
                style={{
                  boxShadow: `6px 6px 0px 0px ${member.color}`,
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="flex flex-col items-center w-full">
                  {/* Cyber Avatar Placeholder */}
                  <div
                    className="w-24 h-24 border-2 border-black flex items-center justify-center bg-black/50 mb-4 relative"
                    style={{ borderBottom: `4px solid ${member.color}` }}
                  >
                    <div className="absolute top-1 left-1 text-[8px] opacity-40">DEV_SYS</div>
                    <span
                      className="text-3xl font-bold font-display"
                      style={{ color: member.color }}
                    >
                      {member.initial}
                    </span>
                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-success animate-pulse" />
                  </div>

                  <h3 className="font-display-xl text-sm font-bold text-on-surface mb-1 uppercase">
                    {member.name}
                  </h3>
                  <div
                    className="text-[9px] font-bold px-2 py-0.5 border border-black mb-3 select-none"
                    style={{ backgroundColor: `${member.color}15`, color: member.color, borderColor: member.color }}
                  >
                    {member.role}
                  </div>
                  <p className="font-body-md text-xs text-on-surface-variant leading-relaxed text-justify mb-4">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION: DONATE ── */}
        <div className="h-5 pointer-events-none"></div>
        <section>
          <div className="flex items-center gap-2 mb-6 text-tertiary uppercase font-bold tracking-wider">
            <span>✦</span> CỔNG QUYÊN GÓP ỦNG HỘ / DONATE PORTAL
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* STK & Info */}
            <div className="lg:col-span-7 card p-8 border-4 border-black hard-shadow-tertiary flex flex-col justify-between">
              <div>
                <h2 className="font-display-xl text-lg font-bold text-tertiary mb-4 uppercase flex items-center gap-2">
                  <Heart size={18} className="animate-pulse text-danger" /> ỦNG HỘ DỰ ÁN
                </h2>
                <p className="font-body-lg text-sm sm:text-base text-on-surface-variant leading-relaxed mb-6">
                  Dự án AI Assistant được phát triển hoàn toàn phi lợi nhuận. Sự đóng góp của các bạn sẽ giúp chúng tôi duy trì máy chủ, tối ưu hóa các API hỗ trợ AI và nâng cấp trải nghiệm Desktop AI Assistant. Mọi đóng góp dù lớn hay nhỏ đều là nguồn động lực to lớn cho đội ngũ!
                </p>
                <div className="h-2 pointer-events-none"></div>
                <div className="flex flex-col gap-4">
                  {/* MB Bank */}
                  <div className="border border-outline-variant p-4 bg-black/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-secondary bg-secondary/10 flex items-center justify-center text-secondary">
                        <Landmark size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] text-outline uppercase">Ngân hàng MB BANK (Quân Đội)</div>
                        <div className="font-bold text-sm text-on-surface">Số tài khoản: <span className="text-secondary">0120340560780</span></div>
                        <div className="text-[10px] text-on-surface-variant">Chủ tài khoản: LE TAN LOC</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy('0120340560780', 'Đã sao chép số tài khoản MB Bank!')}
                      className="btn btn-outline btn-sm py-1 px-3 text-[10px]"
                    >
                      SAO CHÉP
                    </button>
                  </div>

                  {/* PayPal */}
                  <div className="border border-outline-variant p-4 bg-black/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border-2 border-tertiary bg-tertiary/10 flex items-center justify-center text-tertiary">
                        <Send size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] text-outline uppercase">Cổng thanh toán quốc tế Paypal</div>
                        <div className="font-bold text-sm text-on-surface">Email nhận: <span className="text-tertiary">letanlochhgg@gmail.com</span></div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy('letanlochhgg@gmail.com', 'Đã sao chép địa chỉ PayPal!')}
                      className="btn btn-outline btn-sm py-1 px-3 text-[10px]"
                    >
                      SAO CHÉP
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-outline uppercase mt-6 border-t border-outline-variant/30 pt-4">
                CẢM ƠN CÁC BẠN ĐÃ ỦNG HỘ DỰ ÁN ❤️
              </div>
            </div>

            {/* QR Code Container */}
            <div className="lg:col-span-5 card p-8 border-4 border-black hard-shadow-secondary flex flex-col items-center justify-center text-center">
              <h3 className="font-display-xl text-xs font-bold text-secondary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode size={14} /> QUÉT MÃ VIETQR
              </h3>

              {/* QR Image Box */}
              <div className="w-60 h-60 bg-white p-3 border-4 border-black relative flex items-center justify-center">
                {/* Tech Corners */}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-black" />
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black" />
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-black" />
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-black" />

                <img src={qrNganHang} alt="VietQR" className="w-full h-full object-contain" />
              </div>

              <div className="text-[10px] text-outline uppercase mt-4">
                Mb Bank · STK 0120340560780
              </div>
              <div className="text-[9px] text-secondary font-bold uppercase mt-1 animate-pulse">
                Quét mã để chuyển khoản nhanh 24/7
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
