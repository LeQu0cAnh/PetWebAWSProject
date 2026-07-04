// src/pages/HomePage.jsx
// Trang chủ — Trợ lý ảo AI Desktop Pet (Phong cách CHRONOS SHARD - Việt hóa)

import { Link } from 'react-router-dom';
import { Download, Users, Zap, Star, ChevronRight, MessageSquare, Terminal, Heart } from 'lucide-react';

const FEATURES = [
  {
    icon: <MessageSquare size={28} />,
    title: 'Trò Chuyện Trợ Lý AI',
    desc: 'Chat trực tiếp ngay trên màn hình. Hỗ trợ dịch thuật, giải đáp thắc mắc, tóm tắt nội dung tài liệu tức thì.',
    color: '#17deca',
  },
  {
    icon: <Terminal size={28} />,
    title: 'Ra Lệnh & Điều Khiển',
    desc: 'Mở ứng dụng, website, tìm kiếm Google, hoặc tự động tạo các tập tin mong muốn chỉ bằng vài dòng lệnh cơ bản.',
    color: '#dab9ff',
  },
  {
    icon: <Heart size={28} />,
    title: 'Focus & Sức Khỏe',
    desc: 'Nhắc nhở uống nước, vận động, giúp bạn duy trì tư thế ngồi khoa học và bảo vệ sức khỏe khi làm việc.',
    color: '#d4a017',
  },
];

const TITLES_PREVIEW = [
  { key: 'TAN_TINH', name: 'Tân Tinh', emoji: '⭐', exp: '0' },
  { key: 'BACH_LOC', name: 'Bạch Lộc', emoji: '🦌', exp: '200' },
  { key: 'THUONG_LANG', name: 'Thương Lang', emoji: '🐺', exp: '600' },
  { key: 'KIM_O', name: 'Kim Ô', emoji: '🌟', exp: '1500' },
  { key: 'XICH_HO', name: 'Xích Hồ', emoji: '🦊', exp: '3000' },
  { key: 'TU_HIEU', name: 'Tử Hiêu', emoji: '🦅', exp: '5500' },
  { key: 'CHU_PHUONG', name: 'Chu Phượng', emoji: '🔥', exp: '9000' },
  { key: 'NGAN_LONG', name: 'Ngân Long', emoji: '🐉', exp: '14000' },
  { key: 'SANG_THE', name: 'Sáng Thế Thần Minh', emoji: '✨', exp: '20000' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden pt-16 pb-32">
      {/* Background Atmosphere (Alchemical Symbols & Digital Decay) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none select-none z-0">
        <div className="absolute top-1/4 left-1/4 text-[12vw] font-headline-md text-secondary">🜁</div>
        <div className="absolute bottom-1/4 right-1/4 text-[10vw] font-headline-md text-tertiary">🜍</div>
        <div className="grid grid-cols-12 w-full h-full">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="border-r border-outline-variant h-full"></div>
          ))}
        </div>
      </div>
      {/* Gamification Level Milestone Marquee */}
      <div className="mb-28 relative h-14 w-full bg-black border-y-2 border-tertiary overflow-hidden flex items-center transform -rotate2 skew-x-[-8deg] z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-container/20 to-transparent"></div>
        <div className="flex items-center gap-12 px-12 animate-marquee whitespace-nowrap font-label-mono text-xs">
          {/* Milestone Items Repeated for Seamless Loop */}
          {Array.from({ length: 2 }).map((_, loopIdx) => (
            <div key={loopIdx} className="flex gap-12">
              {TITLES_PREVIEW.map((t, idx) => (
                <div key={t.key + loopIdx} className="flex items-center gap-2">
                  <span className="text-tertiary opacity-40">0{idx + 1}</span>
                  <span className={t.key === 'SANG_THE' ? 'text-secondary font-bold' : 'text-on-surface-variant'}>
                    {t.emoji} {t.name}
                  </span>
                  <div className="h-1.5 w-6 bg-surface-container-highest">
                    {idx === -1 && <div className="h-full w-full bg-tertiary"></div>}
                    {t.key === 'SANG_THE' && <div className="h-full w-full bg-secondary"></div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* ── Central Hero Section: Quantum Core ── */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-8 pb-12">
        <div className="relative w-72 h-72 sm:w-[32rem] sm:h-[32rem] flex items-center justify-center">
          {/* Rotating Summoning Circle (SVG) */}
          <svg className="absolute w-full h-full vortex-spin text-tertiary/20" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.5"></circle>
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeDasharray="6 4" strokeWidth="1.5"></circle>
            <path d="M 100,10 L 180,150 L 20,150 Z" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
            <path d="M 100,190 L 20,50 L 180,50 Z" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
          </svg>

          {/* Core Visual Box */}
          <div className="relative z-10 w-56 h-56 bg-black border-4 border-tertiary hard-shadow-tertiary flex flex-col items-center justify-center p-6 text-center rotate-3 hover:rotate-0 transition-transform">
            <div className="absolute -top-8 -left-8 font-display-xl text-4xl text-outline opacity-10 pointer-events-none font-label-mono">
            </div>
            <h1 className="font-display-xl text-2xl sm:text-3xl text-on-surface mb-2 uppercase tracking-tighter font-bold">
              AI ASSISTANT
            </h1>
            <p className="font-label-mono text-[10px] text-tertiary mb-6 animate-pulse">
              TRẠNG THÁI: HOẠT ĐỘNG
            </p>
            {/* Download Portal Button */}
            <Link
              to="/download"
              className="btn btn-primary btn-sm skew-x-[-12deg] group relative overflow-hidden active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-1 font-label-mono text-[11px] font-bold">
                <Download size={12} /> TẢI ỨNG DỤNG
              </span>
            </Link>
          </div>
        </div>

        {/* Supporting Subtitle */}
        <div className="text-center max-w-xl px-6 mt-6 relative z-10">
          <p className="font-body-lg text-lg sm:text-xl text-on-surface-variant italic leading-relaxed">
            "Trợ lý AI thông minh – Chat AI mượt mà, điều khiển hệ thống tức thì, bứt phá hiệu suất làm việc cùng bạn!"
          </p>
        </div>
      </section>

      <div className="page-content relative z-10">
        {/* ── Features ── */}
        <section className="mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="card p-8 text-center flex flex-col items-center">
                <div style={{ color: f.color }} className="mb-6 animate-float">
                  {f.icon}
                </div>
                <h3 className="font-display-xl text-lg font-bold text-on-surface mb-3 uppercase tracking-tight">
                  {f.title}
                </h3>
                <p className="font-body-md text-on-surface-variant text-sm sm:text-base leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
        <div className="h-13 pointer-events-none"></div>
        {/* ── Journey Overview ── */}
        <section className="pt-32 mb-24">
          <div className="flex flex-col items-center text-center mb-12 w-full">
            <h2 className="section-title text-3xl font-bold">Hành Trình Đồng Hành</h2>
            <p className="section-subtitle font-body-md max-w-xl !block !text-center mt-3">
              Sử dụng các câu lệnh, trò chuyện với trợ lý và tham gia chia sẻ cộng đồng để tích lũy EXP, thăng tiến các danh hiệu huyền thoại.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {TITLES_PREVIEW.map((t, i) => (
              <div
                key={t.key}
                className={`card p-6 text-center relative flex flex-col items-center justify-center ${t.key === '' ? 'card-gold' : ''
                  }`}
              >
                <div className="text-3xl mb-3">{t.emoji}</div>
                <div className="font-display-xl text-xs sm:text-sm font-bold text-on-surface mb-1 uppercase tracking-tighter">
                  {t.name}
                </div>
                <div className="font-label-mono text-[10px] text-outline">
                  {i === 0 ? 'KHỞI ĐẦU' : `${t.exp}+ EXP`}
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="h-7 pointer-events-none"></div>
        {/* ── CTA ── */}
        <section className="text-center">
          <div className="card p-12 bg-black border-4 border-black relative chasm-shadow-purple flex flex-col items-center justify-center">
            <div className="absolute top-2 left-2 font-label-mono text-[9px] text-outline">

            </div>
            <h2 className="font-display-xl text-2xl sm:text-4xl font-bold mb-4 uppercase tracking-tighter">
              Bắt Đầu Trải Nghiệm
            </h2>
            <p className="font-body-lg text-sm sm:text-base max-w-lg mx-auto text-on-surface-variant mb-8 italic">
              "Tải xuống ứng dụng, tạo tài khoản và biến desktop của bạn trở nên thông minh, sinh động hơn!"
            </p>
            <Link to="/download" className="btn btn-gold btn-lg skew-x-[-10deg]">
              <span className="skew-x-[10deg] flex items-center gap-2">
                <Download size={16} /> TẢI NGAY
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
