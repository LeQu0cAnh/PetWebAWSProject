// src/pages/GuidePage.jsx
// Trang hướng dẫn sử dụng (CHRONOS SHARD Style - Việt hóa)

import { Move, MessageCircle, Heart, ArrowRight, Terminal } from 'lucide-react';

const GUIDE_STEPS = [
  {
    step: '01',
    icon: <Move size={24} />,
    title: 'Tương Tác Cơ Bản',
    desc: 'Nhấn giữ chuột trái để di chuyển và thả Pet ở bất kỳ đâu trên màn hình. Nhấn chuột phải để mở menu cài đặt nhanh.',
    color: '#f0bb35',
  },
  {
    step: '02',
    icon: <MessageCircle size={24} />,
    title: 'Trò Chuyện AI',
    desc: 'Nhấp đúp chuột (Double-click) vào Pet để mở hộp chatbox. Bạn có thể đặt câu hỏi hoặc yêu cầu tóm tắt tài liệu.',
    color: '#17deca',
  },
  {
    step: '03',
    icon: <Heart size={24} />,
    title: 'Chế Độ Sức Khỏe',
    desc: 'Bật tính năng "Focus Mode" trong cài đặt. Pet sẽ nhẹ nhàng nhắc nhở bạn uống nước và vận động sau mỗi 45 phút.',
    color: '#dab9ff',
  },
];

const COMMANDS_LIST = [
  { cmd: '/createfile [tên_file].[đuôi]', desc: 'Tạo nhanh một tập tin văn bản hoặc mã nguồn trống trong thư mục làm việc.', example: '/createfile details.txt' },
  { cmd: '/open [tên_ứng_dụng]', desc: 'Khởi chạy nhanh các chương trình trên hệ thống máy tính của bạn.', example: '/open notepad' },
  { cmd: '/search [nội_dung]', desc: 'Tìm kiếm nhanh thông tin trên Google thông qua trình duyệt mặc định.', example: '/search learn javascript' },
  { cmd: '/web [địa_chỉ_url]', desc: 'Truy cập nhanh vào địa chỉ trang web bất kỳ.', example: '/web youtube.com' },
  { cmd: '[Kéo thả / Gửi hình ảnh]', desc: 'Phân tích hình ảnh bằng AI (OCR trích xuất chữ viết, nhận dạng lỗi màn hình, giải thích code...).', example: 'Gửi ảnh chụp màn hình báo lỗi' },
];

const EXP_TABLE = [
  { action: 'Đăng bài viết', exp: '+20 EXP', icon: '📝' },
  { action: 'Bình luận', exp: '+10 EXP', icon: '💬' },
  { action: 'Like bài viết', exp: '+5 EXP', icon: '❤️' },
  { action: 'Giới hạn/ngày', exp: '100 EXP', icon: '⏰', note: true },
];

export default function GuidePage() {
  return (
    <div className="page-content pt-20 pb-24 font-label-mono">
      {/* Header */}
      <div className="h-7 pointer-events-none"></div>
      <div className="text-center mb-16">
        <h1 className="font-display-xl text-3xl sm:text-5xl font-bold uppercase tracking-tighter text-on-surface mb-2">
          HƯỚNG DẪN NUÔI PET
        </h1>
        <p className="font-body-md text-on-surface-variant text-sm sm:text-base italic">
          "Tìm hiểu cách vận hành, điều khiển và tương tác với trợ lý của bạn"
        </p>
      </div>
      <div className="h-5 pointer-events-none"></div>

      {/* Main Grid: Left Steps, Right Blueprint skill map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start">
        {/* Step Blocks */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {GUIDE_STEPS.map((s, i) => (
            <div key={i} className="card p-6 relative flex gap-6 items-start border-2 border-black">
              <div className="font-display-xl text-4xl font-bold text-outline opacity-10 leading-none">
                {s.step}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <h3 className="font-display-xl text-md font-bold uppercase tracking-tight text-on-surface">
                    {s.title}
                  </h3>
                </div>
                <p className="font-body-md text-on-surface-variant text-sm sm:text-base leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* SVG Skill Tree Map */}
        <div className="lg:col-span-5 card p-6 border-2 border-black flex flex-col justify-between h-[360px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-tertiary text-sm">account_tree</span>
            <h3 className="font-display-xl text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              SƠ ĐỒ HÀNH TRÌNH
            </h3>
          </div>
          <div className="relative flex-1 bg-black border border-outline-variant overflow-hidden h-48 flex items-center justify-center">
            <svg className="w-full h-full p-2" viewBox="0 0 200 100">
              <defs>
                <filter id="constellation-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background space/constellation stars */}
              <circle cx="15" cy="30" r="0.5" fill="#ffffff" opacity="0.3" />
              <circle cx="35" cy="85" r="0.7" fill="#ffffff" opacity="0.5" className="animate-pulse" />
              <circle cx="55" cy="20" r="0.6" fill="#17deca" opacity="0.4" />
              <circle cx="75" cy="90" r="0.5" fill="#ffffff" opacity="0.3" />
              <circle cx="95" cy="15" r="0.8" fill="#7d08ff" opacity="0.5" className="animate-pulse" />
              <circle cx="115" cy="80" r="0.5" fill="#ffffff" opacity="0.4" />
              <circle cx="135" cy="30" r="0.6" fill="#ffffff" opacity="0.3" />
              <circle cx="155" cy="85" r="0.7" fill="#17deca" opacity="0.5" className="animate-pulse" />
              <circle cx="175" cy="55" r="0.5" fill="#ffffff" opacity="0.3" />
              <circle cx="45" cy="15" r="0.5" fill="#ffffff" opacity="0.3" />
              <circle cx="85" cy="75" r="0.6" fill="#ffffff" opacity="0.4" />
              <circle cx="125" cy="15" r="0.5" fill="#ffffff" opacity="0.3" />
              <circle cx="165" cy="70" r="0.6" fill="#7d08ff" opacity="0.4" className="animate-pulse" />

              {/* Glowing Constellation Path */}
              <path
                d="M 20,75 L 40,55 L 60,65 L 80,40 L 100,60 L 120,45 L 140,70 L 160,35 L 180,20"
                fill="none"
                stroke="#17deca"
                strokeWidth="1.2"
                opacity="0.35"
                filter="url(#constellation-glow)"
              />
              <path
                d="M 20,75 L 40,55 L 60,65 L 80,40 L 100,60 L 120,45 L 140,70 L 160,35 L 180,20"
                fill="none"
                stroke="#17deca"
                strokeWidth="0.5"
                strokeDasharray="1,2"
                opacity="0.8"
              />

              {/* Star Nodes */}
              {/* 1. Tân Tinh (Brightest Start) */}
              <circle cx="20" cy="75" r="5" fill="#17deca" opacity="0.3" className="animate-pulse" filter="url(#constellation-glow)" />
              <circle cx="20" cy="75" r="2.5" fill="#ffffff" />
              <text x="20" y="87" textAnchor="middle" className="fill-tertiary font-bold text-[5.5px] tracking-tighter" style={{ fontFamily: 'monospace' }}>⭐ TÂN TINH</text>

              {/* 2. Bạch Lộc */}
              <circle cx="40" cy="55" r="1.5" fill="#17deca" />
              <text x="40" y="48" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🦌 B.LỘC</text>

              {/* 3. Thương Lang */}
              <circle cx="60" cy="65" r="1.5" fill="#17deca" />
              <text x="60" y="74" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🐺 T.LANG</text>

              {/* 4. Kim Ô */}
              <circle cx="80" cy="40" r="1.5" fill="#17deca" />
              <text x="80" y="33" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🌟 KIM Ô</text>

              {/* 5. Xích Hồ */}
              <circle cx="100" cy="60" r="1.5" fill="#17deca" />
              <text x="100" y="69" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🦊 X.HỔ</text>

              {/* 6. Tử Hiêu */}
              <circle cx="120" cy="45" r="1.5" fill="#17deca" />
              <text x="120" y="38" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🦅 T.HIÊU</text>

              {/* 7. Chu Phượng */}
              <circle cx="140" cy="70" r="1.5" fill="#17deca" />
              <text x="140" y="79" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🔥 C.PHƯỢNG</text>

              {/* 8. Ngân Long */}
              <circle cx="160" cy="35" r="1.5" fill="#17deca" />
              <text x="160" y="28" textAnchor="middle" fill="#888888" className="text-[4px]" style={{ fontFamily: 'monospace' }}>🐉 N.LONG</text>

              {/* 9. Sáng Thế */}
              <circle cx="180" cy="20" r="6" fill="#7d08ff" opacity="0.4" className="animate-pulse" filter="url(#constellation-glow)" />
              <circle cx="180" cy="20" r="2.5" fill="#ffffff" />
              <text x="180" y="12" textAnchor="middle" className="fill-secondary font-bold text-[5.5px] tracking-tighter" style={{ fontFamily: 'monospace' }}>✨ SÁNG THẾ</text>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
          </div>
          <p className="font-body-md text-on-surface-variant text-[11px] italic mt-4 leading-tight">
            "Hành trình nuôi dưỡng trợ lý đồng hành, thăng tiến sức mạnh hạt nhân."
          </p>
        </div>
      </div>
      <div className="h-5 pointer-events-none"></div>

      {/* System Commands Console */}
      <div className="card p-8 border-2 border-black mb-16">
        <h2 className="font-display-xl text-lg font-bold text-tertiary mb-3 uppercase flex items-center gap-2">
          <Terminal size={18} /> 💻 DANH SÁCH LỆNH HỆ THỐNG
        </h2>
        <p className="font-body-md text-on-surface-variant text-sm mb-6">
          Bạn có thể ra lệnh trực tiếp cho Pet bằng cách gõ vào khung chat các lệnh điều khiển hệ thống sau:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COMMANDS_LIST.map((c, i) => (
            <div key={i} className="border border-outline-variant bg-black/30 p-5 flex flex-col gap-3">
              <div className="font-mono text-xs text-tertiary bg-tertiary/10 border border-tertiary/20 px-3 py-1.5 w-fit">
                {c.cmd}
              </div>
              <p className="font-body-md text-on-surface-variant text-sm leading-relaxed">
                {c.desc}
              </p>
              <div className="text-[10px] text-outline mt-1">
                VÍ DỤ: <code className="text-secondary">{c.example}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-5 pointer-events-none"></div>
      {/* EXP Table & FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* EXP Table */}
        <div className="lg:col-span-6 card p-8 border-2 border-black">
          <h2 className="font-display-xl text-lg font-bold text-secondary mb-6 uppercase">
            ⚡ MA TRẬN NHẬN EXP
          </h2>
          <div className="flex flex-col gap-3">
            {EXP_TABLE.map((row, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-4 border ${row.note
                  ? 'border-secondary bg-secondary/5 text-secondary'
                  : 'border-outline-variant bg-black/20 text-on-surface-variant'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{row.icon}</span>
                  <span className="text-sm font-semibold">{row.action}</span>
                </div>
                <span className={`font-bold text-sm ${row.note ? 'text-secondary' : 'text-tertiary'}`}>
                  {row.exp}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="lg:col-span-6 card p-8 border-2 border-black">
          <h2 className="font-display-xl text-lg font-bold text-tertiary mb-6 uppercase">
            ❓ CÂU HỎI THƯỜNG GẶP
          </h2>
          <div className="flex flex-col gap-6">
            {[
              { q: 'EXP có reset vào ngày mới không?', a: 'Không! EXP tích lũy mãi mãi. Chỉ có giới hạn 100 EXP nhận được trong 1 ngày là reset, tổng EXP thì không.' },
              { q: 'Tôi có thể like bài của chính mình không?', a: 'Bạn không nhận được EXP khi tương tác với chính mình, nhưng vẫn có thể like bình thường.' },
              { q: 'Danh hiệu Admin có nghĩa gì?', a: 'Admin được gán bởi Admin cấp cao và có khả năng kiểm duyệt nội dung, quản lý hệ thống.' },
              { q: 'Bài viết có được đăng ngay không?', a: 'Tùy thuộc vào cài đặt của Admin. Chế độ Auto thì đăng ngay, chế độ Manual thì chờ Admin duyệt.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <ArrowRight size={14} className="text-tertiary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-display-xl text-xs font-bold text-on-surface mb-1 uppercase">
                    {item.q}
                  </h4>
                  <p className="font-body-md text-on-surface-variant text-sm leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
