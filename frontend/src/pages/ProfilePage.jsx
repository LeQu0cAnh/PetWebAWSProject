// src/pages/ProfilePage.jsx
// Trang Profile — seeker status dashboard (CHRONOS SHARD Style)

import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Edit3, Shield, Ban, Save, X, Camera, FileText } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import TitleBadge from '../components/TitleBadge';
import ExpBar from '../components/ExpBar';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { id } = useParams();
  const { dbUser, isAdmin, refreshDbUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const isOwn = dbUser?.id === id;
  const canEdit = isOwn || isAdmin;

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        api.get(`/api/users/${id}`),
        api.get(`/api/users/${id}/posts`),
      ]);
      setProfile(profileRes.data.data);
      setPosts(postsRes.data.data);
      setForm({
        username: profileRes.data.data.username || '',
        bio: profileRes.data.data.bio || '',
      });
    } catch (err) {
      toast.error('Không tìm thấy người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = isAdmin && !isOwn ? `/api/admin/users/${id}` : `/api/users/${id}`;
      const res = await api.patch(endpoint, form);
      setProfile(prev => ({ ...prev, ...res.data.data }));
      setEditing(false);
      toast.success('Đã cập nhật thông tin!');
      if (isOwn) refreshDbUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleBan = async () => {
    if (!confirm(`${profile.status === 'BANNED' ? 'Mở khóa' : 'Khóa'} tài khoản ${profile.username}?`)) return;
    try {
      const endpoint = profile.status === 'BANNED'
        ? `/api/admin/users/${id}/unban`
        : `/api/admin/users/${id}/ban`;
      await api.post(endpoint);
      toast.success(profile.status === 'BANNED' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi!');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh tối đa 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const presignRes = await api.get('/api/upload/presigned', {
        params: { type: 'avatar', contentType: file.type },
      });
      const { uploadUrl, fileUrl } = presignRes.data.data;

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      const endpoint = isAdmin && !isOwn ? `/api/admin/users/${id}` : `/api/users/${id}`;
      await api.patch(endpoint, { avatar: fileUrl });

      setProfile(prev => ({ ...prev, avatar: fileUrl }));
      if (isOwn) refreshDbUser();
      toast.success('Đã cập nhật avatar! 🖼️');
    } catch (err) {
      toast.error('Lỗi upload avatar');
      console.error('Avatar upload error:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePostUpdate = () => loadProfile();

  if (loading) {
    return (
      <div className="page-content pt-20">
        <div className="loading-screen">
          <div className="spinner" />
          <span>ĐANG TẢI HỒ SƠ NGƯỜI DÙNG_...</span>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const avatarLetter = profile.username?.[0]?.toUpperCase() || '?';

  return (
    
    <div className="page-content pt-20 pb-24 font-label-mono">
      <div className="h-7 pointer-events-none"></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Trái: Hổ sơ Seeker Reactor */}
        <div className="lg:col-span-5 relative">
          {/* Vòng quay nền hiệu ứng */}
          <div className="absolute -top-6 -left-6 w-56 h-56 border border-secondary/20 animate-spin-slow pointer-events-none z-0" />

          <div className="relative z-10 card p-8 border-4 border-black hard-shadow-secondary rotate-[-1deg] hover:rotate-0 transition-transform">
            <div className="flex flex-col gap-6">
              {/* Profile Avatar Frame */}
              <div className="relative w-48 h-48 border-4 border-tertiary flex items-center justify-center bg-black group overflow-hidden">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="avatar"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                ) : (
                  <div className="text-6xl font-bold text-tertiary">{avatarLetter}</div>
                )}
                {/* Nút tải ảnh đại diện */}
                {canEdit && (
                  <>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-2 right-2 bg-tertiary text-black border border-black p-2 hover:bg-white active:scale-95 transition-all"
                      title="Tải lên ảnh đại diện"
                    >
                      {uploadingAvatar ? (
                        <div className="spinner w-3 h-3 border" />
                      ) : (
                        <Camera size={14} />
                      )}
                    </button>
                  </>
                )}
                {profile.status === 'BANNED' && (
                  <div className="absolute inset-0 bg-danger/80 flex items-center justify-center text-white font-bold text-xs font-display-xl uppercase">
                    ĐÃ BỊ KHÓA
                  </div>
                )}
              </div>

              {/* Thông tin Seeker / Form chỉnh sửa */}
              <div>
                {editing ? (
                  <div className="flex flex-col gap-4">
                    <div className="form-group">
                      <label className="form-label">Tên người dùng</label>
                      <input
                        className="form-input"
                        value={form.username}
                        onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                        maxLength={30}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chi tiết tiểu sử</label>
                      <textarea
                        className="form-input"
                        value={form.bio}
                        onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                        rows={3}
                        maxLength={300}
                        placeholder="Hãy viết gì đó vào đây..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                        <Save size={12} /> {saving ? 'ĐANG LƯU...' : 'LƯU'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                        <X size={12} /> HỦY
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-display-xl text-xl sm:text-2xl font-bold uppercase text-secondary">
                        {profile.username}
                      </h1>
                      <TitleBadge title={profile.title} size="sm" />
                      {profile.role === 'ADMIN' && <span className="badge badge-admin">Quản trị viên</span>}
                    </div>

                    <p className="text-[11px] text-outline leading-tight">
                      MÃ NGƯỜI DÙNG: #{profile.id?.substring(0, 8) || 'N/A'} // TRẠNG THÁI: {profile.status === 'BANNED' ? 'ĐÃ KHÓA' : 'HOẠT ĐỘNG'}
                    </p>

                    {profile.bio && (
                      <p className="font-body-md text-on-surface-variant text-sm leading-relaxed border-l-2 border-outline-variant pl-3 italic py-1">
                        "{profile.bio}"
                      </p>
                    )}

                    <div className="flex gap-4 text-xs text-outline pt-2 border-t border-outline-variant/30">
                      <span>Bài viết: <strong className="text-on-surface-variant">{profile._count?.posts || 0}</strong></span>
                      <span>Tổng EXP: <strong className="text-tertiary">{profile.totalExp} EXP</strong></span>
                    </div>

                    {/* Thanh kinh nghiệm Lõi đồng bộ */}
                    <div className="mt-4 p-4 border border-outline bg-black/40">
                      <div className="font-label-mono text-[9px] text-secondary mb-3">LÕI ĐỒNG BỘ EXP NGƯỜI DÙNG</div>
                      <ExpBar totalExp={profile.totalExp} title={profile.title} />
                    </div>

                    {/* Các nút hành động */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {canEdit && (
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                          <Edit3 size={12} /> SỬA TIỂU SỬ
                        </button>
                      )}
                      {isAdmin && !isOwn && (
                        <button
                          className={`btn btn-sm ${profile.status === 'BANNED' ? 'btn-outline border-success text-success' : 'btn-danger'}`}
                          onClick={handleBan}
                        >
                          <Ban size={12} /> {profile.status === 'BANNED' ? 'MỞ KHÓA SEEKER' : 'KHÓA SEEKER'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phải: Nhật ký truyền tin */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <h2 className="font-display-xl text-md font-bold text-outline uppercase tracking-wider flex items-center gap-2 mb-2">
            <FileText size={16} className="text-secondary" /> NHẬT KÝ TRUYỀN TIN
            {posts.length > 0 && (
              <span className="text-xs bg-secondary/10 px-2 py-0.5 border border-secondary text-secondary">
                {posts.length}
              </span>
            )}
          </h2>

          {posts.length === 0 ? (
            <div className="card p-12 text-center border-2 border-black flex flex-col items-center justify-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-outline text-sm leading-relaxed mb-6">
                {isOwn ? 'Bạn chưa có tín hiệu truyền tin nào.' : 'Người dùng này chưa có tín hiệu truyền tin.'}
              </p>
              {isOwn && (
                <Link to="/community" className="btn btn-primary btn-sm">
                  GỬI TÍN HIỆU NGAY
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
