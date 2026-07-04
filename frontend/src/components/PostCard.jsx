// src/components/PostCard.jsx
// Component hiển thị 1 bài viết trong Community (CHRONOS SHARD Style)

import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, EyeOff, Trash2, Eye, Shield, ImagePlus, X as XIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import TitleBadge from './TitleBadge';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function PostCard({ post, onUpdate }) {
  const { isAuthenticated, isAdmin, dbUser } = useAuth();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  const commentFileInputRef = useRef(null);
  const [commentImageFiles, setCommentImageFiles] = useState([]);
  const [commentImagePreviews, setCommentImagePreviews] = useState([]);
  const [uploadingCommentImages, setUploadingCommentImages] = useState(false);

  const handleCommentImageSelect = (e) => {
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

    if (commentImageFiles.length + files.length > 5) {
      toast.error('Bình luận tối đa chỉ được 5 hình ảnh');
      return;
    }

    setCommentImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setCommentImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeCommentImageAtIndex = (index) => {
    URL.revokeObjectURL(commentImagePreviews[index]);
    setCommentImageFiles(prev => prev.filter((_, i) => i !== index));
    setCommentImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllCommentImages = () => {
    commentImagePreviews.forEach(url => URL.revokeObjectURL(url));
    setCommentImageFiles([]);
    setCommentImagePreviews([]);
    if (commentFileInputRef.current) commentFileInputRef.current.value = '';
  };

  const uploadCommentImageToS3 = async (file) => {
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

  // ── Lightbox Zoom & Pan State ────────────────────────────────
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const openLightbox = (index, images) => {
    setLightboxImages(images);
    setActiveImageIndex(index);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setActiveImageIndex(null);
    setLightboxImages([]);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex((activeImageIndex + 1) % lightboxImages.length);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex((activeImageIndex - 1 + lightboxImages.length) % lightboxImages.length);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoomScale(prev => {
      const nextScale = Math.max(prev - 0.25, 1);
      if (nextScale === 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return nextScale;
    });
  };

  const handleResetZoom = (e) => {
    e.stopPropagation();
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomScale <= 1) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi });

  // ── Like / Unlike ─────────────────────────────────────────────
  const handleLike = async () => {
    if (!isAuthenticated) return toast.error('Vui lòng đăng nhập để like!');
    if (liking) return;
    setLiking(true);
    try {
      const res = await api.post(`/api/posts/${post.id}/like`);
      setIsLiked(res.data.data.isLiked);
      setLikeCount(res.data.data.likeCount);
      if (res.data.exp?.expAdded > 0) {
        toast.success(`+${res.data.exp.expAdded} EXP!`, { icon: '⚡', duration: 2000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi like');
    } finally {
      setLiking(false);
    }
  };

  // ── Tải Comments ──────────────────────────────────────────────
  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await api.get(`/api/posts/${post.id}/comments`);
        setComments(res.data.data);
      } catch { /* silent */ } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  // ── Gửi Comment ───────────────────────────────────────────────
  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!isAuthenticated) return toast.error('Vui lòng đăng nhập!');
    setSubmittingComment(true);
    try {
      let imageUrls = [];
      if (commentImageFiles.length > 0) {
        setUploadingCommentImages(true);
        try {
          imageUrls = await Promise.all(commentImageFiles.map(file => uploadCommentImageToS3(file)));
        } catch (err) {
          toast.error('Lỗi upload ảnh bình luận.');
          console.error('S3 upload error:', err);
          setUploadingCommentImages(false);
          setSubmittingComment(false);
          return;
        }
        setUploadingCommentImages(false);
      }

      const res = await api.post(`/api/posts/${post.id}/comments`, {
        content: commentText,
        imageUrls
      });
      setComments(prev => [...prev, res.data.data]);
      setCommentText('');
      removeAllCommentImages();
      if (res.data.exp?.expAdded > 0) {
        toast.success(`+${res.data.exp.expAdded} EXP!`, { icon: '⚡', duration: 2000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Admin: Ẩn bài ─────────────────────────────────────────────
  const handleHidePost = async () => {
    try {
      await api.patch(`/api/posts/${post.id}/hide`, { isHidden: !post.isHidden });
      toast.success(post.isHidden ? 'Đã hiện bài viết' : 'Đã ẩn bài viết');
      onUpdate?.();
    } catch { toast.error('Lỗi!'); }
  };

  // ── Admin: Xóa bài ────────────────────────────────────────────
  const handleDeletePost = async () => {
    if (!confirm('Xóa bài viết này?')) return;
    try {
      await api.delete(`/api/posts/${post.id}`);
      toast.success('Đã xóa bài viết');
      onUpdate?.();
    } catch { toast.error('Lỗi!'); }
  };

  // ── Admin: Ẩn comment ─────────────────────────────────────────
  const handleHideComment = async (commentId, isHidden) => {
    try {
      await api.patch(`/api/comments/${commentId}/hide`, { isHidden: !isHidden });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, isHidden: !isHidden } : c));
    } catch { toast.error('Lỗi!'); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Xóa comment này?')) return;
    try {
      await api.delete(`/api/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { toast.error('Lỗi!'); }
  };

  const avatarLetter = post.author?.username?.[0]?.toUpperCase() || '?';

  const renderPostImages = (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) {
      if (post.imageUrl) {
        return (
          <div 
            className="border-2 border-black cursor-zoom-in my-3 overflow-hidden group/img relative"
            onClick={() => openLightbox(0, [post.imageUrl])}
            style={{ maxHeight: 400 }}
          >
            <img 
              src={post.imageUrl} 
              alt="post-img" 
              className="w-full h-full object-cover transition-all duration-300" 
              loading="lazy" 
            />
          </div>
        );
      }
      return null;
    }
    const count = imageUrls.length;
    
    if (count === 1) {
      return (
        <div 
          className="border-2 border-black cursor-zoom-in my-3 overflow-hidden group/img relative"
          onClick={() => openLightbox(0, imageUrls)}
          style={{ maxHeight: 400 }}
        >
          <img 
            src={imageUrls[0]} 
            alt="post-img" 
            className="w-full h-full object-cover block transition-all duration-300" 
            loading="lazy" 
          />
        </div>
      );
    }
    
    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-2 border-2 border-black my-3 overflow-hidden bg-black p-0.5">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="h-60 cursor-zoom-in group/img overflow-hidden" onClick={() => openLightbox(idx, imageUrls)}>
              <img 
                src={url} 
                alt="post-img" 
                className="w-full h-full object-cover transition-all duration-300" 
                loading="lazy" 
              />
            </div>
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid grid-cols-3 gap-2 border-2 border-black my-3 overflow-hidden bg-black p-0.5" style={{ height: 300 }}>
          <div className="col-span-2 h-full cursor-zoom-in group/img overflow-hidden" onClick={() => openLightbox(0, imageUrls)}>
            <img 
              src={imageUrls[0]} 
              alt="post-img" 
              className="w-full h-full object-cover transition-all duration-300" 
              loading="lazy" 
            />
          </div>
          <div className="flex flex-col gap-2 h-full">
            {imageUrls.slice(1, 3).map((url, idx) => (
              <div key={idx} className="flex-1 cursor-zoom-in group/img overflow-hidden" onClick={() => openLightbox(idx + 1, imageUrls)}>
                <img 
                  src={url} 
                  alt="post-img" 
                  className="w-full h-full object-cover transition-all duration-300" 
                  loading="lazy" 
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-2 border-2 border-black my-3 overflow-hidden bg-black p-0.5">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="h-40 cursor-zoom-in group/img overflow-hidden" onClick={() => openLightbox(idx, imageUrls)}>
              <img 
                src={url} 
                alt="post-img" 
                className="w-full h-full object-cover transition-all duration-300" 
                loading="lazy" 
              />
            </div>
          ))}
        </div>
      );
    }

    // count >= 5 (Always shows 5 images, fits nicely without row collapsing)
    const displayUrls = imageUrls.slice(0, 5);
    return (
      <div 
        className="grid grid-cols-6 gap-2 border-2 border-black my-3 overflow-hidden bg-black p-0.5" 
        style={{ height: 350 }}
      >
        {displayUrls.slice(0, 2).map((url, idx) => (
          <div 
            key={idx} 
            className="col-span-3 cursor-zoom-in group/img overflow-hidden" 
            style={{ height: 180 }}
            onClick={() => openLightbox(idx, imageUrls)}
          >
            <img 
              src={url} 
              alt="post-img" 
              className="w-full h-full object-cover transition-all duration-300" 
              loading="lazy" 
            />
          </div>
        ))}
        {displayUrls.slice(2, 4).map((url, idx) => (
          <div 
            key={idx} 
            className="col-span-2 cursor-zoom-in group/img overflow-hidden" 
            style={{ height: 154 }}
            onClick={() => openLightbox(idx + 2, imageUrls)}
          >
            <img 
              src={url} 
              alt="post-img" 
              className="w-full h-full object-cover transition-all duration-300" 
              loading="lazy" 
            />
          </div>
        ))}
        {/* 5th image with blur overlay */}
        <div
          className="col-span-2 relative cursor-zoom-in overflow-hidden"
          style={{ height: 154 }}
          onClick={() => openLightbox(4, imageUrls)}
        >
          <img
            src={displayUrls[4]}
            alt="post-img"
            className="w-full h-full object-cover filter blur-[1px] brightness-50"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold text-lg select-none font-label-mono">
            +{count - 4} ẢNH
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="post-card relative group animate-fade-in font-label-mono">
      {/* ── Header ── */}
      <div className="post-header">
        <Link to={`/user/${post.author?.id}`}>
          <div className="avatar-placeholder w-10 h-10 font-bold flex items-center justify-center bg-black border border-secondary text-secondary flex-shrink-0">
            {post.author?.avatar ? (
              <img src={post.author.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              avatarLetter
            )}
          </div>
        </Link>
        <div className="post-meta">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/user/${post.author?.id}`} className="post-author text-on-surface hover:text-tertiary transition-colors text-sm font-bold">
              {post.author?.username}
            </Link>
            {post.author?.title && <TitleBadge title={post.author.title} />}
          </div>
          <div className="post-time text-[10px] text-outline">{timeAgo}</div>
        </div>
      </div>

      {/* ── Content ── */}
      <p className="post-content font-body-md text-on-surface-variant text-[15px] leading-relaxed my-4">
        {post.content}
      </p>
      
      {/* Render Post Images Grid */}
      {renderPostImages(post.imageUrls)}

      {/* ── Actions ── */}
      <div className="post-actions mt-4">
        <button
          className={`action-btn flex items-center gap-1.5 ${isLiked ? 'liked text-tertiary' : ''}`}
          onClick={handleLike}
          disabled={liking}
        >
          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
          {likeCount > 0 && <span className="font-bold">{likeCount}</span>}
          <span className="text-[10px]">THÍCH</span>
        </button>

        <button className="action-btn flex items-center gap-1.5" onClick={handleToggleComments}>
          <MessageCircle size={14} />
          {post.commentCount > 0 && <span className="font-bold">{post.commentCount}</span>}
          <span className="text-[10px]">{showComments ? 'ĐÓNG' : 'BÌNH LUẬN'}</span>
        </button>
      </div>

      {/* ── Admin Controls Panel (Static, Bottom) ── */}
      {isAdmin && (
        <div className="mt-4 pt-3 border-t-2 border-dashed border-danger flex items-center justify-between bg-danger/5 p-3 border border-danger">
          <div className="flex items-center gap-2 text-xs text-danger font-bold uppercase font-display-xl">
            <Shield size={14} className="text-danger animate-pulse" /> QUẢN TRỊ HỆ THỐNG
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-gold btn-sm border-2 border-black flex items-center gap-1.5"
              onClick={handleHidePost}
            >
              {post.isHidden ? <><Eye size={12} /> HIỂN THỊ BÀI</> : <><EyeOff size={12} /> ẨN BÀI HỆ THỐNG</>}
            </button>
            <button 
              className="btn btn-danger btn-sm border-2 border-black flex items-center gap-1.5" 
              onClick={handleDeletePost}
            >
              <Trash2 size={12} /> XÓA BÀI VIẾT
            </button>
          </div>
        </div>
      )}

      {/* ── Comments Section ── */}
      {showComments && (
        <div className="mt-4 pt-4 border-t-2 border-black flex flex-col gap-4">
          {loadingComments ? (
            <div className="text-center text-outline text-[11px] py-4">
              ĐANG TẢI CÁC PHẢN HỒI_...
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {comments.map(comment => (
                  <div 
                    key={comment.id} 
                    className={`flex gap-3 items-start p-3 border border-outline-variant bg-black/20 ${
                      comment.isHidden ? 'opacity-30' : ''
                    }`}
                  >
                    <div className="avatar-placeholder w-8 h-8 font-bold flex items-center justify-center bg-black border border-outline text-outline flex-shrink-0">
                      {comment.author?.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/user/${comment.author?.id}`} className="text-xs font-bold text-secondary hover:text-tertiary no-underline">
                          {comment.author?.username}
                        </Link>
                        {comment.author?.title && <TitleBadge title={comment.author.title} />}
                      </div>
                      <p className="font-body-md text-on-surface-variant text-sm leading-relaxed">
                        {comment.isHidden ? '[BÌNH LUẬN ĐÃ BỊ ẨN BỞI QUẢN TRỊ VIÊN]' : comment.content}
                      </p>
                      
                      {/* Comment Images */}
                      {!comment.isHidden && comment.imageUrls && comment.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 bg-black p-1">
                          {comment.imageUrls.map((url, idx) => (
                            <div 
                              key={idx} 
                              className="border border-outline cursor-zoom-in w-16 h-16 overflow-hidden group/comment-img relative"
                              onClick={() => openLightbox(idx, comment.imageUrls)}
                            >
                              <img 
                                src={url} 
                                alt="" 
                                className="w-full h-full object-cover transition-all" 
                                loading="lazy" 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Admin triggers */}
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button 
                          className="btn btn-ghost btn-icon p-1 text-outline hover:text-secondary" 
                          onClick={() => handleHideComment(comment.id, comment.isHidden)} 
                          title="Ẩn/Hiện bình luận"
                        >
                          {comment.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button 
                          className="btn btn-ghost btn-icon p-1 text-outline hover:text-danger" 
                          onClick={() => handleDeleteComment(comment.id)} 
                          title="Xóa bình luận"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Comment Input Form */}
              {isAuthenticated && (
                <form onSubmit={handleComment} className="flex flex-col gap-2 mt-2">
                  {/* Previews */}
                  {commentImagePreviews.length > 0 && (
                    <div className="flex gap-2 border border-outline-variant p-2 bg-black/40">
                      {commentImagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative w-12 h-12 border border-outline bg-black overflow-hidden">
                          <img src={preview} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeCommentImageAtIndex(idx)}
                            className="absolute top-0.5 right-0.5 bg-black/80 text-white font-bold p-0.5 hover:text-danger text-[6px]"
                          >
                            <XIcon size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="form-input flex-1 py-2 text-xs"
                      placeholder="NHẬP NỘI DUNG PHẢN HỒI..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />

                    {/* Image Attachment inside Echo */}
                    <input
                      type="file"
                      ref={commentFileInputRef}
                      onChange={handleCommentImageSelect}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon border border-outline-variant text-tertiary w-9 h-9 p-0 flex items-center justify-center flex-shrink-0"
                      onClick={() => commentFileInputRef.current?.click()}
                      title="Đính kèm ảnh bình luận (Tối đa 5)"
                    >
                      <ImagePlus size={14} />
                    </button>

                    <button 
                      type="submit" 
                      className="btn btn-primary btn-sm flex-shrink-0 py-2 h-9"
                      disabled={submittingComment || uploadingCommentImages || !commentText.trim()}
                    >
                      {uploadingCommentImages ? 'ĐANG TẢI...' : submittingComment ? 'ĐANG GỬI...' : 'BÌNH LUẬN'}
                    </button>
                  </div>
                </form>
              )}

              {!isAuthenticated && (
                <p className="text-[10px] text-outline text-center py-2 uppercase">
                  <Link to="/login" className="text-secondary font-bold hover:underline">ĐĂNG NHẬP</Link> ĐỂ GỬI BÌNH LUẬN
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      {activeImageIndex !== null && lightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/98 z-[9999] flex flex-col justify-between p-6 select-none animate-fade-in font-label-mono"
          onClick={closeLightbox}
        >
          {/* Top Panel Controls */}
          <div 
            className="flex justify-between items-center bg-black/60 border border-outline-variant p-3 w-full max-w-lg mx-auto z-[10002]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex gap-2 items-center">
              <button 
                className="btn btn-ghost btn-sm border border-outline-variant py-1 px-3 text-xs" 
                onClick={handleZoomOut} 
                disabled={zoomScale <= 1}
              >
                -
              </button>
              <span className="text-white text-xs font-bold font-label-mono min-w-[40px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button 
                className="btn btn-ghost btn-sm border border-outline-variant py-1 px-3 text-xs" 
                onClick={handleZoomIn} 
                disabled={zoomScale >= 4}
              >
                +
              </button>
              {zoomScale > 1 && (
                <button 
                  className="btn btn-outline btn-sm py-1 px-2.5 text-[10px]" 
                  onClick={handleResetZoom}
                >
                  MẶC ĐỊNH
                </button>
              )}
            </div>

            <div className="text-[10px] text-outline">
              ẢNH: {activeImageIndex + 1} / {lightboxImages.length}
            </div>
            
            <button 
              onClick={closeLightbox}
              className="text-white hover:text-danger text-2xl font-bold bg-transparent border-none cursor-pointer leading-none px-2"
              title="Đóng"
            >
              &times;
            </button>
          </div>

          {/* Core Image container */}
          <div 
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden"
            style={{ cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onClick={closeLightbox}
          >
            {/* Prev Trigger */}
            {lightboxImages.length > 1 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-4 z-[10002] bg-black/60 border-2 border-outline hover:border-tertiary text-white w-12 h-12 flex items-center justify-center text-xl cursor-pointer transition-all active:scale-95"
                title="Trước"
              >
                &#8249;
              </button>
            )}

            <img
              src={lightboxImages[activeImageIndex]}
              alt="zoom-view"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={e => e.stopPropagation()}
              style={{
                maxHeight: '75vh',
                maxWidth: '90vw',
                objectFit: 'contain',
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'auto',
                border: '2px solid #000',
                boxShadow: '0 0 20px rgba(0,0,0,0.8)'
              }}
            />

            {/* Next Trigger */}
            {lightboxImages.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-4 z-[10002] bg-black/60 border-2 border-outline hover:border-tertiary text-white w-12 h-12 flex items-center justify-center text-xl cursor-pointer transition-all active:scale-95"
                title="Sau"
              >
                &#8250;
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {lightboxImages.length > 1 && (
            <div 
              className="flex gap-2 justify-center max-w-lg mx-auto w-full bg-black/80 border border-outline-variant p-2 overflow-x-auto scrollbar-none z-[10002]"
              onClick={e => e.stopPropagation()}
            >
              {lightboxImages.map((url, idx) => (
                <button
                  key={url + idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(idx);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className={`w-12 h-12 overflow-hidden bg-black p-0 border transition-all ${
                    idx === activeImageIndex 
                      ? 'border-tertiary opacity-100 shadow-[0_0_8px_#17deca]' 
                      : 'border-outline-variant opacity-50 hover:opacity-80'
                  }`}
                  style={{ flexShrink: 0 }}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
