/**
 * prisma/seed.js
 * 
 * Seed dữ liệu mặc định cho bảng SystemConfig.
 * Chạy: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultConfigs = [
  // --- Download Links ---
  {
    key: 'download_url_windows',
    value: 'https://example.com/petweb-setup.exe',
    description: 'Link tải file cài đặt cho Windows (.exe)',
  },
  {
    key: 'download_url_mac',
    value: 'https://example.com/petweb-setup.dmg',
    description: 'Link tải file cài đặt cho macOS (.dmg)',
  },
  {
    key: 'download_url_linux',
    value: 'https://example.com/petweb-setup.AppImage',
    description: 'Link tải file cài đặt cho Linux (.AppImage)',
  },
  {
    key: 'download_version',
    value: '1.0.0',
    description: 'Phiên bản hiện tại của Desktop Pet',
  },

  // --- EXP Configuration ---
  {
    key: 'exp_like',
    value: '5',
    description: 'Số EXP nhận được khi Like một bài viết',
  },
  {
    key: 'exp_comment',
    value: '10',
    description: 'Số EXP nhận được khi Comment một bài viết',
  },
  {
    key: 'exp_post',
    value: '20',
    description: 'Số EXP nhận được khi đăng một bài viết mới',
  },
  {
    key: 'exp_daily_cap',
    value: '100',
    description: 'Giới hạn EXP tối đa có thể nhận trong một ngày',
  },

  // --- Post Moderation ---
  {
    key: 'post_approval_mode',
    value: 'auto',
    description:
      'Chế độ duyệt bài: "auto" (tự động APPROVED) hoặc "manual" (chờ Admin duyệt)',
  },

  // --- Title Thresholds (EXP cần đạt) ---
  {
    key: 'title_bach_loc_exp',
    value: '200',
    description: 'EXP tối thiểu để đạt danh hiệu Bạch Lộc',
  },
  {
    key: 'title_thuong_lang_exp',
    value: '600',
    description: 'EXP tối thiểu để đạt danh hiệu Thương Lang',
  },
  {
    key: 'title_kim_o_exp',
    value: '1500',
    description: 'EXP tối thiểu để đạt danh hiệu Kim Ô',
  },
  {
    key: 'title_xich_ho_exp',
    value: '3000',
    description: 'EXP tối thiểu để đạt danh hiệu Xích Hồ',
  },
  {
    key: 'title_tu_hieu_exp',
    value: '5500',
    description: 'EXP tối thiểu để đạt danh hiệu Tử Hiêu',
  },
  {
    key: 'title_chu_phuong_exp',
    value: '9000',
    description: 'EXP tối thiểu để đạt danh hiệu Chu Phượng',
  },
  {
    key: 'title_ngan_long_exp',
    value: '14000',
    description: 'EXP tối thiểu để đạt danh hiệu Ngân Long',
  },
  {
    key: 'title_sang_the_exp',
    value: '20000',
    description: 'EXP tối thiểu để đạt danh hiệu Sáng Thế Thần Minh',
  },
  {
    key: 'profanity_words',
    value: 'dit,dit me,dit ma,dmm,dcm,dcmm,dkm,djt,địt,đụ,đéo,đù,đĩ,đỉ,lon,lồn,buoi,buồi,cac,cặc,cu,cứt,ngu,ngu vl,ngu vcl,ngu loz,lol,loz,lồz,clgt,vai lon,vai lol,vai cac,cham,chim,vl,vcl,vkl,vclll,cc,cl,ml,cmm,cms,cdmm,dm,dmm,dml,dmmm,me may,me m,con cho,thang cho,do cho,mat day,mat danh,khon nan,do ngu,thang ngu,do mat day,vo hoc,do dien,thang dien,con di,gai diem,du ma,suc vat,do de tien,thang ranh,đ!t,d!t,đ1t,d1t,l0n,l0z,l0l,c4c,c@c,fuck,fck,fuk,fuq,fking,fucking,fcking,shit,sh1t,sht,shyt,bitch,b1tch,btch,ass,asshole,a$$,damn,dick,d1ck,dck,bastard,whore,slut,cunt,cock,penis,vagina,nigger,nigga,n1gga,n1gger,retard,retarded,stfu,gtfo,lmao,wtf,motherfucker,mf,mofo,piss,crap',
    description: 'Danh sách các từ cấm (ngăn cách bằng dấu phẩy)',
  },
];

async function main() {
  console.log('🌱 Seeding SystemConfig...');

  for (const config of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value }, // Ghi đè để cập nhật các mốc EXP mới
      create: config,
    });
  }

  console.log(`✅ Seeded ${defaultConfigs.length} system configs.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
