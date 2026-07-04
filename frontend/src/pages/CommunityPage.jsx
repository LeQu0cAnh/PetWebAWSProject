// src/pages/CommunityPage.jsx
// Trang Cộng Đồng — Infinite Scroll + EXP Banner + Post Create (CHRONOS SHARD Style)

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { PenSquare, AlertCircle, ImagePlus, X as XIcon, Terminal, Activity } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import TitleBadge from '../components/TitleBadge';
import toast from 'react-hot-toast';

const TITLE_MILESTONES = [
  { emoji: '⭐', name: 'Tân Tinh', exp: 0 },
  { emoji: '🦌', name: 'Bạch Lộc', exp: 200 },
  { emoji: '🐺', name: 'Thương Lang', exp: 600 },
  { emoji: '🌟', name: 'Kim Ô', exp: 1500 },
  { emoji: '🦊', name: 'Xích Hồ', exp: 3000 },
  { emoji: '🦅', name: 'Tử Hiêu', exp: 5500 },
  { emoji: '🔥', name: 'Chu Phượng', exp: 9000 },
  { emoji: '🐉', name: 'Ngân Long', exp: 14000 },
  { emoji: '✨', name: 'Sáng Thế Thần Minh', exp: 20000 },
];

export default function CommunityPage() {
  const { isAuthenticated, dbUser, refreshDbUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const { ref: bottomRef, inView } = useInView({ threshold: 0 });

  const loadPosts = useCallback(async (reset = false) => {
    if (loading) return;
    if (!reset && !hasMore) return;
    setLoading(true);

    try {
      const cursorParam = reset ? '' : (cursor ? `&cursor=${cursor}` : '');
      const res = await api.get(`/api/posts?limit=10${cursorParam}`);
      const { data, pagination } = res.data;

      setPosts(prev => reset ? data : [...prev, ...data]);
      setCursor(pagination.nextCursor);
      setHasMore(pagination.hasMore);
    } catch (err) {
      toast.error('Không thể tải bài viết');
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [loading, hasMore, cursor]);

  useEffect(() => { loadPosts(true); }, []);

  useEffect(() => {
    if (inView && initialLoaded && hasMore && !loading) {
      loadPosts();
    }
  }, [inView]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalid = files.some(file => !file.type.startsWith('image/'));
    if (invalid) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }

    const tooLarge = files.some(file => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      toast.error('Mỗi ảnh tối đa 5MB');
      return;
    }

    if (imageFiles.length + files.length > 25) {
      toast.error('Đăng tối đa 25 hình ảnh mỗi bài viết');
      return;
    }

    setImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImageAtIndex = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllImages = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImageToS3 = async (file) => {
    const res = await api.get('/api/upload/presigned', {
      params: { type: 'post-image', contentType: file.type },
    });
    const { uploadUrl, fileUrl } = res.data.data;

    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    return fileUrl;
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setSubmitting(true);
    try {
      let imageUrls = [];

      if (imageFiles.length > 0) {
        setUploadingImage(true);
        try {
          imageUrls = await Promise.all(imageFiles.map(file => uploadImageToS3(file)));
        } catch (err) {
          toast.error('Lỗi upload ảnh. Bài viết sẽ được đăng không kèm ảnh.');
          console.error('S3 upload error:', err);
        }
        setUploadingImage(false);
      }

      const res = await api.post('/api/posts', {
        content: postContent,
        imageUrls,
      });
      const { data: newPost, isPending, message } = res.data;

      toast.success(message || 'Đăng bài thành công!', {
        icon: isPending ? '⏳' : '🎉',
        duration: 4000,
      });

      if (!isPending) {
        setPosts(prev => [newPost, ...prev]);
        refreshDbUser();
      }

      setPostContent('');
      removeAllImages();
      setShowCreatePost(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi đăng bài');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostUpdate = () => loadPosts(true);

  return (
    <div className="relative pt-20 pb-24 font-label-mono">
      {/* Thanh chạy cột mốc cấp độ */}
      <div className="mb-12 relative h-14 w-full bg-black border-y-2 border-tertiary overflow-hidden flex items-center transform -rotate-1 skew-x-[-12deg] z-20">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-container/20 to-transparent"></div>
        <div className="flex items-center gap-12 px-12 animate-marquee whitespace-nowrap text-xs">
          {Array.from({ length: 2 }).map((_, loopIdx) => (
            <div key={loopIdx} className="flex gap-12">
              {TITLE_MILESTONES.map((t, idx) => (
                <div key={t.name + loopIdx} className="flex items-center gap-2">
                  <span className="text-tertiary opacity-40">0{idx + 1}</span>
                  <span className={t.exp === 20000 ? 'text-secondary font-bold' : 'text-on-surface-variant'}>
                    {t.emoji} {t.name}
                  </span>
                  <div className="h-1.5 w-6 bg-surface-container-highest">
                    {idx === -1 && <div className="h-full w-full bg-tertiary animate-pulse"></div>}
                    {t.exp === 20000 && <div className="h-full w-full bg-secondary"></div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="h-5 pointer-events-none"></div>
      <div className="page-content grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* ── Bảng tin chính ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Khu vực đăng bài */}
          {isAuthenticated && (
            <div className="card p-6 border-2 border-black">
              {!showCreatePost ? (
                <button
                  className="btn btn-outline w-full flex justify-start items-center gap-3 border border-outline-variant text-outline bg-black/20"
                  onClick={() => setShowCreatePost(true)}
                >
                  <div className="avatar-placeholder w-8 h-8 font-bold flex items-center justify-center bg-black border border-tertiary text-tertiary">
                    {dbUser?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-xs">TRUYỀN TIN VÀO HƯ VÔ...</span>
                </button>
              ) : (
                <form onSubmit={handleSubmitPost} className="flex flex-col gap-4">
                  <div className="flex gap-3 items-start">
                    <div className="avatar-placeholder w-10 h-10 font-bold flex items-center justify-center bg-black border border-tertiary text-tertiary flex-shrink-0">
                      {dbUser?.avatar ? (
                        <img src={dbUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        dbUser?.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <textarea
                      className="form-input flex-1 min-h-[100px]"
                      placeholder="NHẬP NỘI DUNG ĐỂ TRUYỀN TIN..."
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      rows={4}
                      autoFocus
                      maxLength={5000}
                    />
                  </div>

                  {/* Ảnh xem trước */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 border border-outline-variant p-2 bg-black/40">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative h-16 border border-outline bg-black overflow-hidden">
                          <img src={preview} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImageAtIndex(idx)}
                            className="absolute top-1 right-1 bg-black/80 text-white font-bold p-1 hover:text-danger active:scale-95 transition-all text-[8px]"
                          >
                            <XIcon size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-between items-center gap-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon border border-outline-variant text-tertiary p-2"
                        onClick={() => fileInputRef.current?.click()}
                        title="Đính kèm ảnh (Tối đa 25)"
                      >
                        <ImagePlus size={16} />
                      </button>
                      <span className="text-[10px] text-outline">
                        KÝ TỰ: {postContent.length}/5000
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setShowCreatePost(false); setPostContent(''); removeAllImages(); }}
                      >
                        HỦY
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm skew-x-[-12deg]"
                        disabled={submitting || uploadingImage || !postContent.trim()}
                      >
                        <span className="skew-x-[12deg] flex items-center gap-1.5 font-bold">
                          ĐĂNG BÀI <PenSquare size={12} />
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Posts Feed Grid */}
          <div className="flex flex-col gap-6">
            {!initialLoaded && (
              <div className="loading-screen">
                <div className="spinner" />
                <span>ĐANG TẢI BẢN TIN BÀI VIẾT_...</span>
              </div>
            )}

            {initialLoaded && posts.length === 0 && (
              <div className="card p-16 text-center border-2 border-black">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="font-display-xl text-md font-bold uppercase text-on-surface mb-2">BẢN TIN TRỐNG</h3>
                <p className="text-outline text-xs">Chưa có tín hiệu truyền tin nào được ghi nhận.</p>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {posts.map(post => (
                <div key={post.id} className="asymmetric-feed-item group">
                  <PostCard post={post} onUpdate={handlePostUpdate} />
                </div>
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            <div ref={bottomRef}>
              {loading && initialLoaded && (
                <div className="text-center py-6">
                  <div className="spinner w-8 h-8" />
                </div>
              )}
              {!hasMore && initialLoaded && posts.length > 0 && (
                <p className="text-center text-[10px] text-outline uppercase tracking-wider py-8">
                  ✦ HẾT HỘP TIN TRUYỀN TẢI ✦
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Thanh bên ── */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
          {/* Trạng thái người dùng */}
          {isAuthenticated && dbUser && (
            <div className="card p-6 border-4 border-black hard-shadow-secondary">

              <div className="flex items-center gap-3 mb-4">
                <div className="avatar-placeholder w-10 h-10 font-bold flex items-center justify-center bg-black border border-secondary text-secondary">
                  {dbUser.avatar ? (
                    <img src={dbUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    dbUser.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-on-surface uppercase leading-tight mb-1">
                    {dbUser.username}
                  </div>
                  <TitleBadge title={dbUser.title} size="sm" />
                </div>
              </div>
              <div className="bg-black/40 border border-outline-variant p-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline">TỔNG EXP TÍCH LŨY</span>
                  <strong className="text-secondary font-bold">{dbUser.totalExp} EXP</strong>
                </div>
              </div>
            </div>
          )}

          {/* Quy tắc tính EXP */}
          <div className="card p-6 border-2 border-black">
            <h3 className="font-display-xl text-xs font-bold text-outline uppercase tracking-wider mb-4">
              📖 QUY TẮC ĐỒNG BỘ EXP
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: '📝', action: 'Đăng bài', exp: '+20 EXP' },
                { icon: '💬', action: 'Bình luận', exp: '+10 EXP' },
                { icon: '❤️', action: 'Like bài', exp: '+5 EXP' },
                { icon: '⏰', action: 'Giới hạn/ngày', exp: '100 EXP' },
              ].map(row => (
                <div key={row.action} className="flex justify-between items-center p-2.5 bg-black/30 border border-outline-variant text-[11px]">
                  <span className="text-outline flex gap-2 items-center">
                    {row.icon} {row.action.toUpperCase()}
                  </span>
                  <span className="font-bold text-tertiary font-label-mono">{row.exp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mốc danh hiệu */}
          <div className="card p-6 border-2 border-black">
            <h3 className="font-display-xl text-xs font-bold text-outline uppercase tracking-wider mb-4">
              🏆 CỘT MỐC DANH HIỆU
            </h3>
            <div className="flex flex-col gap-2">
              {TITLE_MILESTONES.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] text-outline">
                  <span>
                    {m.emoji} {m.name.toUpperCase()}
                  </span>
                  <span className="font-bold font-label-mono text-on-surface-variant">
                    {i === 0 ? 'BẮT ĐẦU' : `${m.exp} EXP`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cảnh báo đăng nhập */}
          {!isAuthenticated && (
            <div className="card p-6 border-2 border-danger text-center bg-danger/5">
              <AlertCircle size={24} className="text-danger mx-auto mb-3" />
              <p className="text-on-error-container text-[11px] leading-relaxed mb-4 uppercase">
                YÊU CẦU ĐĂNG NHẬP ĐỂ TƯƠNG TÁC
              </p>
              <a href="/login" className="btn btn-danger btn-sm w-full">
                ĐĂNG NHẬP
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
