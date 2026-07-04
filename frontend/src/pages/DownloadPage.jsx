// src/pages/DownloadPage.jsx
// Trang tải xuống ứng dụng (CHRONOS SHARD Style - Việt hóa)

import { useEffect, useState } from 'react';
import { Download, Monitor, Apple, Terminal, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../lib/api';

export default function DownloadPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/system/download').then(res => {
      setConfig(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const platforms = [
    {
      key: 'windows',
      icon: <Monitor size={32} />,
      name: 'Windows',
      desc: 'Windows 10 / 11 (64-bit)',
      format: '.exe',
      url: config?.download_url_windows,
      color: '#17deca', // Neon Teal
    },
    {
      key: 'mac',
      icon: <Apple size={32} />,
      name: 'macOS',
      desc: 'macOS 11.0 Big Sur trở lên',
      format: '.dmg',
      url: config?.download_url_mac,
      color: '#dab9ff', // Neon Purple
    },
    {
      key: 'linux',
      icon: <Terminal size={32} />,
      name: 'Linux',
      desc: 'Ubuntu 20.04+ / Debian / Fedora',
      format: '.AppImage',
      url: config?.download_url_linux,
      color: '#f0bb35', // Gold
    },
  ];

  const features = [
    'Trợ lý AI Chatbox thông minh trực tiếp hỗ trợ giải đáp & dịch thuật',
    'Ra lệnh hệ thống nhanh: Mở phần mềm, tạo file, tra cứu Google',
    'Nhắc nhở sức khỏe thông minh (Focus Mode, nhắc uống nước & tư thế ngồi)',
    'Chạy ngầm siêu nhẹ, tối ưu RAM không ảnh hưởng hiệu suất máy',
    'Tự động đồng bộ tiến độ, cấp độ và danh hiệu với tài khoản đám mây',
  ];

  return (
    <div className="page-content pt-20 pb-24 font-label-mono">
      {/* Header */}
      <div className="h-7 pointer-events-none"></div>
      <div className="text-center mb-16 relative">
        <div className="inline-flex items-center gap-2 border border-tertiary bg-tertiary/10 px-4 py-1.5 text-xs text-tertiary mb-4">
          <Download size={12} />
          <span>{loading ? 'ĐANG TẢI...' : `PHIÊN BẢN HỆ THỐNG: v${config?.download_version || '1.0.0'}`}</span>
        </div>
        <div className="h-5 pointer-events-none"></div>
        <h1 className="font-display-xl text-3xl sm:text-5xl font-bold uppercase tracking-tighter text-on-surface mb-2">
          TẢI ỨNG DỤNG AI ASSISTANT
        </h1>
        <p className="font-body-md text-on-surface-variant text-sm sm:text-base italic">
          "Chọn hệ điều hành phù hợp để bắt đầu đồng hành cùng trợ lý của bạn."
        </p>
      </div>
      <div className="h-5 pointer-events-none"></div>
      {/* Download Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {platforms.map(p => (
          <div key={p.key} className="card p-8 text-center flex flex-col justify-between h-80 border-2 border-black hover:border-tertiary">
            <div>
              <div className="mb-6 flex justify-center" style={{ color: p.color }}>
                {p.icon}
              </div>
              <h3 className="font-display-xl text-xl font-bold mb-2 uppercase text-on-surface">
                {p.name}
              </h3>
              <p className="text-[11px] text-outline leading-relaxed">{p.desc}</p>
            </div>

            <div className="mt-6">
              {loading ? (
                <div className="btn btn-outline btn-sm w-full cursor-wait opacity-50">
                  ĐANG ĐỌC DỮ LIỆU...
                </div>
              ) : (p.url && p.url.trim() !== '') ? (
                <a
                  href={p.url.trim()}
                  className="btn btn-primary btn-sm w-full flex items-center justify-center gap-1.5 skew-x-[-8deg]"
                >
                  <span className="skew-x-[8deg] flex items-center gap-1.5 font-bold">
                    TẢI BẢN {p.format} <ExternalLink size={12} />
                  </span>
                </a>
              ) : (
                <div className="btn btn-outline btn-sm w-full opacity-30 cursor-not-allowed">
                  SẮP RA MẮT
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="h-5 pointer-events-none"></div>
      {/* Features & Requirements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Features list */}
        <div className="lg:col-span-6 card card-gold p-8">
          <h3 className="font-display-xl text-lg font-bold text-secondary mb-6 uppercase tracking-tight">
            ⚡ TÍNH NĂNG CHÍNH
          </h3>
          <div className="flex flex-col gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex gap-3 items-start">
                <CheckCircle size={14} className="text-secondary mt-1 flex-shrink-0" />
                <span className="font-body-md text-on-surface-variant text-sm leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="lg:col-span-6 card p-8 border-2 border-black">
          <h3 className="font-display-xl text-lg font-bold text-tertiary mb-6 uppercase tracking-tight">
            🖥️ YÊU CẦU CẤU HÌNH
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px]">
            {/* Minimum */}
            <div className="border border-outline-variant p-4 bg-black/40">
              <h4 className="font-display-xl text-xs font-bold text-on-surface mb-3 uppercase">
                &gt; CẤU HÌNH TỐI THIỂU
              </h4>
              <ul className="flex flex-col gap-2 text-outline">
                <li><strong className="text-on-surface-variant">HĐH:</strong> Win 10 / macOS 11 / Ubuntu 20</li>
                <li><strong className="text-on-surface-variant">CPU:</strong> Intel i3 / Ryzen 3</li>
                <li><strong className="text-on-surface-variant">RAM:</strong> 2 GB</li>
                <li><strong className="text-on-surface-variant">Card:</strong> Intel HD 4000</li>
                <li><strong className="text-on-surface-variant">Ổ cứng:</strong> 500 MB trống</li>
              </ul>
            </div>
            {/* Recommended */}
            <div className="border border-tertiary p-4 bg-black/40">
              <h4 className="font-display-xl text-xs font-bold text-tertiary mb-3 uppercase">
                &gt; KHUYẾN NGHỊ
              </h4>
              <ul className="flex flex-col gap-2 text-outline">
                <li><strong className="text-tertiary">HĐH:</strong> Win 11 / macOS 13 / Ubuntu 22</li>
                <li><strong className="text-tertiary">CPU:</strong> Intel i5 / Ryzen 5</li>
                <li><strong className="text-tertiary">RAM:</strong> 4 GB+</li>
                <li><strong className="text-tertiary">Card:</strong> GTX 1050 / RX 560</li>
                <li><strong className="text-tertiary">Ổ cứng:</strong> 1 GB trống</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
