// src/pages/AdminPage.jsx
// Trang quản trị Admin — ADM_CMD_CTR Control Room (CHRONOS SHARD Style)

import { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Settings, Users, FileText, RefreshCw,
  LayoutDashboard, TrendingUp, UserX, MessageSquare, Heart,
  Eye, EyeOff, Trash2, Shield, Download, Terminal, Play
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import TitleBadge from '../components/TitleBadge';

const TABS = [
  { id: 'dashboard', label: 'TỔNG QUAN', icon: <LayoutDashboard size={14} /> },
  { id: 'moderation', label: 'KIỂM DUYỆT', icon: <FileText size={14} /> },
  { id: 'hidden', label: 'BÀI VIẾT ẨN', icon: <Eye size={14} /> },
  { id: 'users', label: 'NGƯỜI DÙNG', icon: <Users size={14} /> },
  { id: 'settings_dl', label: 'ĐƯỜNG DẪN TẢI', icon: <Download size={14} /> },
  { id: 'settings_exp', label: 'ĐỒNG BỘ EXP', icon: <Settings size={14} /> },
  { id: 'settings_profanity', label: 'HỆ THỐNG TỪ CẤM', icon: <EyeOff size={14} /> },
];

// Quick-select values cho EXP daily cap (nhỏ hơn để dễ nhập)
const CAP_QUICK_VALUES = [50, 100, 150, 200, 300, 500, 750, 1000];

export default function AdminPage() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Moderation state
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Hidden posts state
  const [hiddenPosts, setHiddenPosts] = useState([]);
  const [loadingHidden, setLoadingHidden] = useState(false);

  // Settings state
  const [configs, setConfigs] = useState({});
  const [configEdits, setConfigEdits] = useState({});
  const [approvalMode, setApprovalMode] = useState('auto');
  const [savingConfig, setSavingConfig] = useState(false);

  // Profanity state
  const [profanityWords, setProfanityWords] = useState([]);
  const [newWordInput, setNewWordInput] = useState('');

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Ban modal states
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banUserId, setBanUserId] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');

  // Title modal states
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [titleUserId, setTitleUserId] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('TAN_TINH');

  // Terminal state simulation
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    'admin@chronos_shard:~$ initial connection established.',
    '>> security mode: OPTIMAL // override: INACTIVE'
  ]);

  // Guard
  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/');
  }, [isAdmin, isLoading]);

  // Load data per tab
  useEffect(() => {
    if (activeTab === 'dashboard') loadStats();
    if (activeTab === 'moderation') { loadPending(); loadConfigs(); }
    if (activeTab === 'hidden') loadHiddenPosts();
    if (activeTab === 'settings_dl' || activeTab === 'settings_exp' || activeTab === 'settings_profanity') loadConfigs();
    if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  // ── Load Stats ──────────────────────────────────────────────────
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data.data);
    } catch { toast.error('Lỗi tải thống kê'); }
    finally { setLoadingStats(false); }
  };

  // ── Load Pending Posts ──────────────────────────────────────────
  const loadPending = async () => {
    setLoadingPosts(true);
    try {
      const res = await api.get('/api/admin/posts/pending?limit=20');
      setPendingPosts(res.data.data);
    } catch { toast.error('Lỗi tải danh sách'); }
    finally { setLoadingPosts(false); }
  };

  const handleApprove = async (postId) => {
    try {
      await api.patch(`/api/admin/posts/${postId}/approve`);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Đã phê duyệt bài viết ✅');
    } catch { toast.error('Lỗi!'); }
  };

  const handleReject = async (postId) => {
    try {
      await api.patch(`/api/admin/posts/${postId}/reject`);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Đã từ chối bài viết');
    } catch { toast.error('Lỗi!'); }
  };

  // ── Load Hidden Posts ───────────────────────────────────────────
  const loadHiddenPosts = async () => {
    setLoadingHidden(true);
    try {
      const res = await api.get('/api/admin/posts/hidden?limit=50');
      setHiddenPosts(res.data.data);
    } catch { toast.error('Lỗi tải bài viết bị ẩn'); }
    finally { setLoadingHidden(false); }
  };

  const handleRestorePost = async (postId) => {
    try {
      await api.patch(`/api/posts/${postId}/hide`, { isHidden: false });
      setHiddenPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Đã hiển thị lại bài viết ✅');
    } catch { toast.error('Lỗi!'); }
  };

  const handleDeleteHiddenPost = async (postId) => {
    if (!confirm('Xóa vĩnh viễn bài viết này?')) return;
    try {
      await api.delete(`/api/posts/${postId}`);
      setHiddenPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Đã xóa bài viết');
    } catch { toast.error('Lỗi!'); }
  };

  // ── Load Configs ────────────────────────────────────────────────
  const loadConfigs = async () => {
    try {
      const res = await api.get('/api/admin/config');
      const configMap = {};
      res.data.data.forEach(c => { configMap[c.key] = c.value; });
      setConfigs(configMap);
      setConfigEdits(configMap);
      setApprovalMode(configMap['post_approval_mode'] || 'auto');

      const wordsStr = configMap['profanity_words'] || '';
      const wordsArr = wordsStr.split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      setProfanityWords(wordsArr);
    } catch { toast.error('Lỗi tải config'); }
  };

  const handleToggleApprovalMode = async () => {
    const newMode = approvalMode === 'auto' ? 'manual' : 'auto';
    setApprovalMode(newMode);
    try {
      await api.patch('/api/admin/config', {
        configs: [{ key: 'post_approval_mode', value: newMode }]
      });
      toast.success(`Chế độ duyệt bài đã chuyển sang: ${newMode === 'manual' ? 'Thủ Công (Manual)' : 'Tự Động (Auto)'}`);
    } catch {
      toast.error('Lỗi khi cập nhật chế độ duyệt');
      setApprovalMode(approvalMode); // Rollback
    }
  };

  const handleSaveConfigs = async (targetKeys) => {
    setSavingConfig(true);
    try {
      const updates = targetKeys.map(k => ({
        key: k,
        value: String(configEdits[k] ?? configs[k] ?? '')
      }));
      await api.patch('/api/admin/config', { configs: updates });
      toast.success('Đã lưu cấu hình hệ thống!');
      loadConfigs();
    } catch { toast.error('Lỗi khi lưu'); }
    finally { setSavingConfig(false); }
  };

  const handleSaveProfanity = async () => {
    setSavingConfig(true);
    try {
      const wordsStr = profanityWords.join(',');
      await api.patch('/api/admin/config', {
        configs: [{ key: 'profanity_words', value: wordsStr }]
      });
      toast.success('Đã lưu danh sách từ cấm!');
      loadConfigs();
    } catch { toast.error('Lỗi khi lưu từ cấm'); }
    finally { setSavingConfig(false); }
  };

  const handleAddWord = (e) => {
    e.preventDefault();
    const cleanWord = newWordInput.trim().toLowerCase();
    if (!cleanWord) return;
    if (profanityWords.includes(cleanWord)) {
      toast.error('Từ này đã có trong danh sách!');
      return;
    }
    setProfanityWords(prev => [...prev, cleanWord]);
    setNewWordInput('');
  };

  const handleDeleteWord = (wordToDelete) => {
    setProfanityWords(prev => prev.filter(w => w !== wordToDelete));
  };

  // ── Load Users ──────────────────────────────────────────────────
  const loadUsers = async (search = '') => {
    setLoadingUsers(true);
    try {
      const res = await api.get(`/api/admin/users?limit=30${search ? `&search=${search}` : ''}`);
      setUsers(res.data.data);
    } catch { toast.error('Lỗi tải users'); }
    finally { setLoadingUsers(false); }
  };

  const handleBanClick = (userId, currentStatus) => {
    if (currentStatus === 'BANNED') {
      handleUnbanUser(userId);
    } else {
      setBanUserId(userId);
      setBanReason('');
      setBanDuration('permanent');
      setBanModalOpen(true);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await api.post(`/api/admin/users/${userId}/unban`);
      toast.success('Đã mở khóa tài khoản');
      loadUsers(userSearch);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi khi mở khóa!'); }
  };

  const submitBanUser = async (e) => {
    e.preventDefault();
    try {
      let banExpiresAt = null;
      if (banDuration !== 'permanent') {
        const now = new Date();
        if (banDuration === '1h') now.setHours(now.getHours() + 1);
        else if (banDuration === '1d') now.setDate(now.getDate() + 1);
        else if (banDuration === '7d') now.setDate(now.getDate() + 7);
        else if (banDuration === '30d') now.setDate(now.getDate() + 30);
        banExpiresAt = now.toISOString();
      }

      await api.post(`/api/admin/users/${banUserId}/ban`, {
        banReason: banReason.trim(),
        banExpiresAt,
      });

      toast.success('Đã khóa tài khoản');
      setBanModalOpen(false);
      loadUsers(userSearch);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi khi khóa tài khoản!'); }
  };

  const handleTitleClick = (userId, currentTitle) => {
    setTitleUserId(userId);
    setSelectedTitle(currentTitle || 'TAN_TINH');
    setTitleModalOpen(true);
  };

  const submitChangeTitle = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/admin/users/${titleUserId}`, {
        title: selectedTitle,
      });
      toast.success('Đã thay đổi danh hiệu thành công!');
      setTitleModalOpen(false);
      loadUsers(userSearch);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi khi cập nhật danh hiệu!'); }
  };

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalLogs(prev => [...prev, `admin@chronos_shard:~$ ${cmd}`]);
    setTerminalInput('');

    setTimeout(() => {
      if (cmd.startsWith('inject')) {
        setTerminalLogs(prev => [...prev, '>> SUCCESS: payload injected into community feeds.']);
      } else if (cmd === 'clear') {
        setTerminalLogs([]);
      } else if (cmd === 'help') {
        setTerminalLogs(prev => [
          ...prev,
          'Available diagnostics commands:',
          '  help     - Show lists info',
          '  inject   - Execute sync diagnostics payload',
          '  clear    - Clear terminal shell logs'
        ]);
      } else {
        setTerminalLogs(prev => [...prev, `>> ERROR: command not recognized: ${cmd}. Access Denied.`]);
      }
    }, 450);
  };

  if (isLoading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="relative min-h-screen pt-20 pb-24 font-label-mono text-sm">
      <div className="scanline" />

      {/* Main Grid Wrapper */}
      <div className="h-5 pointer-events-none"></div>
      <div className="page-content grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">

        {/* Left Side: Sidebar Relays */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="card p-5 border-4 border-black hard-shadow-secondary">
            <div className="flex items-center gap-3 border-b-2 border-black pb-3 mb-4">
              <div className="w-10 h-10 border-2 border-tertiary bg-surface-container flex items-center justify-center text-tertiary text-lg">
                <Shield size={18} />
              </div>
              <div>
                <div className="font-bold text-on-surface uppercase">TRUNG TÂM ĐIỀU KHIỂN</div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none whitespace-nowrap">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`btn text-left justify-start py-2.5 px-3 w-auto lg:w-full border border-transparent flex-shrink-0 ${activeTab === t.id
                    ? 'btn-primary border-black'
                    : 'btn-ghost hover:border-outline-variant text-on-surface-variant'
                    }`}
                >
                  <span className="flex items-center gap-2.5 font-bold uppercase text-[10px]">
                    {t.icon} {t.label}
                    {t.id === 'moderation' && pendingPosts.length > 0 && (
                      <span className="bg-danger text-black font-bold px-1.5 text-[8px] flex-shrink-0">
                        {pendingPosts.length}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Side: Tab Details Canvas */}
        <main className="lg:col-span-9 flex flex-col gap-8">

          {/* Header Console Title */}
          <div className="relative mb-4">
            <h1 className="font-display-xl text-3xl sm:text-4xl font-bold uppercase tracking-tighter text-on-surface">
              QUẢN TRỊ <span className="text-tertiary">HỆ THỐNG</span>
            </h1>
            <div className="text-[9px] text-outline opacity-70 leading-normal mt-1">
              // PHÂN HỆ ĐIỀU KHIỂN HỆ THỐNG
            </div>
            <div className="w-full h-1 bg-on-surface mt-3" />
            <div className="w-1/2 h-3 bg-tertiary mt-1 opacity-20" />
          </div>

          {/* ══ TAB: Dashboard ══ */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8">
              {loadingStats ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : stats ? (
                <>
                  {/* Real Statistics Blocks */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="card p-5 border-2 border-black text-center flex flex-col items-center">
                      <div className="text-outline uppercase text-[10px] mb-1">TỔNG NGƯỜI DÙNG</div>
                      <div className="font-display-xl text-3xl font-bold text-tertiary">{stats.totalUsers?.toLocaleString()}</div>
                      <div className="text-[10px] text-outline mt-2">{stats.bannedUsers > 0 ? `${stats.bannedUsers} bị khóa` : 'Không có vi phạm'}</div>
                    </div>
                    <div className="card p-5 border-2 border-black text-center flex flex-col items-center">
                      <div className="text-outline uppercase text-[10px] mb-1">TỔNG BÀI VIẾT</div>
                      <div className="font-display-xl text-3xl font-bold text-secondary">{stats.totalPosts?.toLocaleString()}</div>
                      <div className={`text-[10px] mt-2 font-bold ${stats.pendingPosts > 0 ? 'text-danger animate-pulse' : 'text-outline'}`}>
                        {stats.pendingPosts > 0 ? `${stats.pendingPosts} chờ duyệt` : 'Không có bài chờ'}
                      </div>
                    </div>
                    <div className="card p-5 border-2 border-black text-center flex flex-col items-center col-span-2 md:col-span-1">
                      <div className="text-outline uppercase text-[10px] mb-1">TƯƠNG TÁC</div>
                      <div className="font-display-xl text-2xl font-bold text-on-surface flex items-center gap-2">
                        <span className="text-tertiary">{stats.totalComments?.toLocaleString()}</span>
                        <span className="text-outline text-sm">/</span>
                        <span className="text-secondary">{stats.totalLikes?.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-outline mt-2">Bình luận / Lượt thích</div>
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Threat logs */}
                    <div className="card p-6 border-2 border-black">
                      <h3 className="font-display-xl text-xs font-bold text-secondary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={14} /> BÀI VIẾT MỚI NHẤT
                      </h3>
                      <div className="flex flex-col gap-3">
                        {stats.recentPosts?.slice(0, 5).map(p => (
                          <div key={p.id} className="border border-outline-variant p-3 bg-black/20 flex gap-2 items-start text-[11px]">
                            <div className="avatar-placeholder w-7 h-7 font-bold flex items-center justify-center bg-black border border-outline text-outline flex-shrink-0">
                              {p.author?.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-outline">
                                <strong className="text-on-surface">{p.author?.username}</strong>: {p.content?.substring(0, 45)}...
                              </div>
                              <div className="flex gap-2 items-center text-[9px] text-outline mt-1.5">
                                <span className={`px-1.5 border border-black text-[8px] ${p.status === 'APPROVED' ? 'bg-success/20 text-success' : 'bg-secondary/20 text-secondary'}`}>
                                  {p.status === 'APPROVED' ? 'ĐÃ DUYỆT' : p.status === 'PENDING' ? 'CHỜ DUYỆT' : p.status === 'REJECTED' ? 'BỊ TỪ CHỐI' : p.status}
                                </span>
                                <span>{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Users Db */}
                    <div className="card p-6 border-2 border-black">
                      <h3 className="font-display-xl text-xs font-bold text-tertiary mb-4 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={14} /> NGƯỜI DÙNG MỚI
                      </h3>
                      <div className="flex flex-col gap-2.5">
                        {stats.recentUsers?.slice(0, 5).map(u => (
                          <Link
                            to={`/user/${u.id}`}
                            key={u.id}
                            className="border border-outline-variant p-2.5 bg-black/20 flex items-center gap-3 no-underline hover:border-tertiary transition-colors"
                          >
                            <div className="avatar-placeholder w-7 h-7 font-bold flex items-center justify-center bg-black border border-outline text-outline flex-shrink-0">
                              {u.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                                {u.username}
                                {u.title && <TitleBadge title={u.title} />}
                              </div>
                              <div className="text-[9px] text-outline">{u.email}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card p-12 text-center border-2 border-black">
                  <p className="text-outline">Không thể tải dữ liệu thống kê</p>
                  <button className="btn btn-primary btn-sm mt-4" onClick={loadStats}>Thử lại</button>
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: Moderation Threat Feed ══ */}
          {activeTab === 'moderation' && (
            <div className="flex flex-col gap-6">
              {/* Override settings lever */}
              <div className="card p-6 border-4 border-black bg-secondary/5 chasm-shadow-purple flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-display-xl text-xs font-bold text-secondary uppercase">OVERRIDE APPROVAL ENGINE</h4>
                  <p className="text-[10px] text-outline mt-1 leading-normal uppercase">
                    {approvalMode === 'auto'
                      ? '⚡ AUTO_DRIVE: Bài viết mới được phê duyệt trực tiếp thông qua bộ lọc.'
                      : '🔒 MANUAL_COMMAND: Bài viết mới ở trạng thái PENDING yêu cầu phê duyệt thủ công.'}
                  </p>
                </div>
                <div className="toggle-wrapper" onClick={handleToggleApprovalMode}>
                  <div className={`toggle-track ${approvalMode === 'manual' ? 'on bg-secondary' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <h3 className="font-display-xl font-bold text-outline uppercase">
                  Bài viết chờ duyệt {pendingPosts.length > 0 && `(${pendingPosts.length})`}
                </h3>
                <button className="btn btn-ghost btn-sm text-tertiary flex items-center gap-1" onClick={loadPending}>
                  <RefreshCw size={12} /> CẬP NHẬT
                </button>
              </div>

              {loadingPosts ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : pendingPosts.length === 0 ? (
                <div className="card p-12 text-center border-2 border-black flex flex-col items-center">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-outline text-xs uppercase font-bold">HÀNG ĐỢI KIỂM DUYỆT TRỐNG</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingPosts.map(post => (
                    <div key={post.id} className="card p-6 border-2 border-danger relative bg-danger/5">
                      <div className="absolute top-2 right-2 bg-danger text-black font-bold font-label-mono text-[9px] px-1.5 py-0.5">
                        CẦN KIỂM DUYỆT
                      </div>

                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 border border-outline bg-black/40 flex items-center justify-center text-outline flex-shrink-0 font-bold">
                          {post.author?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[11px] text-on-surface">
                            NGƯỜI ĐĂNG: {post.author?.username} // <span className="text-outline">{post.author?.email}</span>
                          </div>
                          <div className="text-[9px] text-outline mt-0.5">
                            THỜI GIAN: {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
                          </div>
                        </div>
                      </div>

                      <p className="font-body-md text-on-surface-variant text-sm sm:text-base leading-relaxed p-4 bg-black/40 border border-outline-variant my-4 italic">
                        "{post.content}"
                      </p>

                      {post.imageUrl && (
                        <div className="border border-outline bg-black mb-4 overflow-hidden" style={{ maxHeight: 240 }}>
                          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        <button
                          className="btn btn-outline btn-sm border-success text-success bg-success/5 flex-1"
                          onClick={() => handleApprove(post.id)}
                        >
                          PHÊ DUYỆT BÀI
                        </button>
                        <button
                          className="btn btn-danger btn-sm flex-1"
                          onClick={() => handleReject(post.id)}
                        >
                          TỪ CHỐI BÀI VIẾT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: Bài viết bị ẩn ══ */}
          {activeTab === 'hidden' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display-xl text-sm font-bold text-secondary uppercase flex items-center gap-2">
                  <Eye size={16} /> BÀI VIẾT BỊ ẨN ({hiddenPosts.length})
                </h3>
                <button className="btn btn-ghost btn-sm text-tertiary flex items-center gap-1" onClick={loadHiddenPosts}>
                  <RefreshCw size={12} /> CẬP NHẬT
                </button>
              </div>

              {loadingHidden ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : hiddenPosts.length === 0 ? (
                <div className="card p-12 text-center border-2 border-black flex flex-col items-center">
                  <div className="text-4xl mb-3">👁️</div>
                  <p className="text-outline text-xs uppercase font-bold">KHÔNG CÓ BÀI VIẾT BỊ ẨN</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {hiddenPosts.map(post => (
                    <div key={post.id} className="card p-5 border-2 border-secondary/40 bg-secondary/5 relative">
                      <div className="absolute top-2 right-2 bg-secondary/20 text-secondary font-bold font-label-mono text-[9px] px-1.5 py-0.5 border border-secondary/30">
                        ẨN
                      </div>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 border border-outline bg-black/40 flex items-center justify-center text-outline flex-shrink-0 font-bold text-xs">
                          {post.author?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-on-surface">
                            {post.author?.username} <span className="text-outline font-normal">// {post.author?.email}</span>
                          </div>
                          <div className="text-[9px] text-outline mt-0.5">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
                          </div>
                        </div>
                      </div>

                      <p className="font-body-md text-on-surface-variant text-sm leading-relaxed p-3 bg-black/40 border border-outline-variant mb-4 italic">
                        "{post.content?.substring(0, 200)}{post.content?.length > 200 ? '...' : ''}"
                      </p>

                      <div className="flex gap-3">
                        <button
                          className="btn btn-outline btn-sm border-tertiary text-tertiary bg-tertiary/5 flex-1 flex items-center justify-center gap-1"
                          onClick={() => handleRestorePost(post.id)}
                        >
                          <Eye size={12} /> HIỂN THỊ LẠI
                        </button>
                        <button
                          className="btn btn-danger btn-sm flex-1 flex items-center justify-center gap-1"
                          onClick={() => handleDeleteHiddenPost(post.id)}
                        >
                          <Trash2 size={12} /> XÓA VĨNH VIỄN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: Relays Settings_dl ══ */}
          {activeTab === 'settings_dl' && (
            <div className="card p-8 border-4 border-black max-w-xl">
              <h2 className="font-display-xl text-sm font-bold text-tertiary mb-6 uppercase">
                💾 CẤU HÌNH ĐƯỜNG DẪN TẢI XUỐNG CLIENT
              </h2>

              <div className="flex flex-col gap-5 mb-8">
                <div className="form-group">
                  <label className="form-label">Đường dẫn tải cho Windows (.exe)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configEdits['download_url_windows'] ?? configs['download_url_windows'] ?? ''}
                    onChange={e => setConfigEdits(prev => ({ ...prev, download_url_windows: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đường dẫn tải cho macOS (.dmg)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configEdits['download_url_mac'] ?? configs['download_url_mac'] ?? ''}
                    onChange={e => setConfigEdits(prev => ({ ...prev, download_url_mac: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đường dẫn tải cho Linux (.AppImage)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configEdits['download_url_linux'] ?? configs['download_url_linux'] ?? ''}
                    onChange={e => setConfigEdits(prev => ({ ...prev, download_url_linux: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mã phiên bản ứng dụng (Version ID)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={configEdits['download_version'] ?? configs['download_version'] ?? ''}
                    onChange={e => setConfigEdits(prev => ({ ...prev, download_version: e.target.value }))}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleSaveConfigs(['download_url_windows', 'download_url_mac', 'download_url_linux', 'download_version'])}
                disabled={savingConfig}
              >
                {savingConfig ? 'ĐANG LƯU...' : 'LƯU ĐƯỜNG DẪN'}
              </button>
            </div>
          )}

          {/* ══ TAB: Modulators EXP Settings ══ */}
          {activeTab === 'settings_exp' && (
            <div className="card p-8 border-4 border-black max-w-xl">
              <h2 className="font-display-xl text-sm font-bold text-secondary mb-6 uppercase">
                ⚙️ ĐIỀU CHỈNH HỆ SỐ ĐỒNG BỘ EXP
              </h2>

              <div className="flex flex-col gap-8 mb-8">
                {/* EXP Đăng bài */}
                <div className="form-group">
                  <label className="form-label mb-2 block">EXP ĐĂNG BÀI VIẾT</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      className="form-input w-24 text-center font-bold text-tertiary"
                      value={configEdits['exp_post'] ?? configs['exp_post'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_post: Math.max(0, Number(e.target.value)) }))}
                    />
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      className="flex-1 accent-tertiary h-1 bg-surface-container-highest appearance-none cursor-pointer"
                      value={configEdits['exp_post'] ?? configs['exp_post'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_post: Number(e.target.value) }))}
                    />
                    <span className="text-tertiary font-bold text-xs min-w-[40px]">EXP</span>
                  </div>
                </div>

                {/* EXP Bình luận */}
                <div className="form-group">
                  <label className="form-label mb-2 block">EXP VIẾT BÌNH LUẬN</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      className="form-input w-24 text-center font-bold text-secondary"
                      value={configEdits['exp_comment'] ?? configs['exp_comment'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_comment: Math.max(0, Number(e.target.value)) }))}
                    />
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="5"
                      className="flex-1 accent-secondary h-1 bg-surface-container-highest appearance-none cursor-pointer"
                      value={configEdits['exp_comment'] ?? configs['exp_comment'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_comment: Number(e.target.value) }))}
                    />
                    <span className="text-secondary font-bold text-xs min-w-[40px]">EXP</span>
                  </div>
                </div>

                {/* EXP Like */}
                <div className="form-group">
                  <label className="form-label mb-2 block">EXP THÍCH BÀI VIẾT</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input w-24 text-center font-bold text-secondary"
                      value={configEdits['exp_like'] ?? configs['exp_like'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_like: Math.max(0, Number(e.target.value)) }))}
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      className="flex-1 accent-secondary h-1 bg-surface-container-highest appearance-none cursor-pointer"
                      value={configEdits['exp_like'] ?? configs['exp_like'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_like: Number(e.target.value) }))}
                    />
                    <span className="text-secondary font-bold text-xs min-w-[40px]">EXP</span>
                  </div>
                </div>

                {/* Daily Cap */}
                <div className="form-group">
                  <label className="form-label mb-2 block">GIỚI HẠN EXP HÀNG NGÀY (Nhập thủ công hoặc chọn nhanh)</label>
                  <div className="flex gap-3 items-center mb-3">
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="10"
                      className="form-input w-32 text-center font-bold text-tertiary"
                      value={configEdits['exp_daily_cap'] ?? configs['exp_daily_cap'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_daily_cap: Math.max(0, Number(e.target.value)) }))}
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="50"
                      className="flex-1 accent-tertiary h-1 bg-surface-container-highest appearance-none cursor-pointer"
                      value={configEdits['exp_daily_cap'] ?? configs['exp_daily_cap'] ?? 0}
                      onChange={e => setConfigEdits(prev => ({ ...prev, exp_daily_cap: Number(e.target.value) }))}
                    />
                    <span className="text-tertiary font-bold text-xs min-w-[40px]">EXP</span>
                  </div>
                  {/* Quick-select small values */}
                  <div className="grid grid-cols-4 gap-1 border border-outline bg-black p-2">
                    {CAP_QUICK_VALUES.map(val => {
                      const currentVal = Number(configEdits['exp_daily_cap'] ?? configs['exp_daily_cap'] ?? 0);
                      const isActive = currentVal === val;
                      return (
                        <div
                          key={val}
                          onClick={() => setConfigEdits(prev => ({ ...prev, exp_daily_cap: val }))}
                          className={`h-8 border border-black flex items-center justify-center font-label-mono text-[10px] cursor-pointer transition-all ${isActive
                            ? 'bg-tertiary text-black font-bold shadow-[0_0_8px_#17deca]'
                            : 'bg-surface-container hover:border-tertiary text-outline'
                            }`}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-outline mt-2">
                    GIỚI HẠN HIỆN TẠI: <span className="text-tertiary font-bold">{configEdits['exp_daily_cap'] ?? configs['exp_daily_cap'] ?? 0} EXP / NGÀY</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-gold"
                onClick={() => handleSaveConfigs(['exp_post', 'exp_comment', 'exp_like', 'exp_daily_cap'])}
                disabled={savingConfig}
              >
                {savingConfig ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH EXP'}
              </button>
            </div>
          )}

          {/* ══ TAB: Bộ lọc từ ngữ cấm ══ */}
          {activeTab === 'settings_profanity' && (
            <div className="card p-8 border-4 border-black">
              <h2 className="font-display-xl text-sm font-bold text-danger mb-4 uppercase">
                🚫 BỘ LỌC TỪ NGỮ CẤM HỆ THỐNG
              </h2>
              <p className="text-outline text-xs leading-relaxed mb-6 uppercase">
                BỘ LỌC CHẶN PHÁT TÍN HIỆU CHỨA CÁC ĐOẠN MÃ ĐỘC HẠI HOẶC TỪ NGỮ CẤM TRONG HỆ THỐNG.
              </p>

              {/* Form inject word */}
              <form onSubmit={handleAddWord} className="flex gap-3 mb-6">
                <input
                  type="text"
                  className="form-input flex-1"
                  placeholder="Nhập từ cấm mới (ví dụ: ngu, dit...)"
                  value={newWordInput}
                  onChange={e => setNewWordInput(e.target.value)}
                />
                <button type="submit" className="btn btn-danger skew-x-[-10deg]">
                  <span className="skew-x-[10deg] flex items-center gap-1 font-bold">
                    THÊM MỚI <Play size={10} />
                  </span>
                </button>
              </form>
              <div className="h-5 pointer-events-none"></div>
              {/* Current word databases */}
              <div className="mb-6">
                <label className="form-label mb-2 block">Cơ sở dữ liệu từ cấm ({profanityWords.length})</label>

                {profanityWords.length === 0 ? (
                  <div className="p-8 text-center bg-black/40 border border-dashed border-outline-variant text-outline text-xs">
                    Hệ thống đang sử dụng danh sách từ cấm mặc định trong mã nguồn. Hãy thêm từ mới để cá nhân hóa danh sách.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-4 bg-black border border-outline">
                    {profanityWords.map(word => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1.5 bg-danger/10 border border-danger/30 text-danger-container text-[10px] px-2.5 py-1"
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => handleDeleteWord(word)}
                          className="bg-transparent border-none text-outline hover:text-white cursor-pointer font-bold leading-none"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="h-3 pointer-events-none"></div>
              <button
                className="btn btn-danger"
                onClick={handleSaveProfanity}
                disabled={savingConfig}
              >
                {savingConfig ? 'Đang lưu...' : 'LƯU'}
              </button>
            </div>
          )}

          {/* ══ TAB: Users Database ══ */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  className="form-input flex-1"
                  placeholder="Tìm kiếm username hoặc email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadUsers(userSearch)}
                  style={{ maxWidth: 350 }}
                />
                <button className="btn btn-outline btn-sm" onClick={() => loadUsers(userSearch)}>
                  TÌM
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setUserSearch(''); loadUsers(''); }}>
                  <RefreshCw size={12} /> TẤT CẢ NGƯỜI DÙNG
                </button>
              </div>

              {loadingUsers ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : users.length === 0 ? (
                <div className="card p-8 text-center border border-black">
                  <p className="text-outline text-xs">Không tìm thấy người dùng nào</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {users.map(u => (
                    <div key={u.id} className="card p-4 border-2 border-black flex flex-wrap items-center gap-4 justify-between bg-black/20 hover:bg-black/40">
                      <div className="flex items-center gap-3">
                        <Link to={`/user/${u.id}`}>
                          <div className="avatar-placeholder w-9 h-9 font-bold flex items-center justify-center bg-black border border-outline text-outline">
                            {u.avatar ? (
                              <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.username?.[0]?.toUpperCase()
                            )}
                          </div>
                        </Link>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/user/${u.id}`} className="font-bold text-on-surface hover:text-tertiary no-underline text-xs">
                              {u.username}
                            </Link>
                            {u.title && <TitleBadge title={u.title} />}
                            {u.role === 'ADMIN' && <span className="badge badge-admin text-[8px]">Quản trị viên</span>}
                            {u.status === 'BANNED' && (
                              <span className="badge text-[8px] bg-danger/10 border-danger/30 text-danger-container">
                                ĐÃ KHÓA
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-outline mt-0.5">
                            {u.email} // THAM GIA {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: vi })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-[10px] text-outline mr-2">
                          <span className="text-tertiary font-bold">{u.totalExp} EXP</span> · {u._count?.posts || 0} bài viết
                        </div>
                        <button
                          className="btn btn-outline btn-sm py-1.5 px-3 text-[10px]"
                          onClick={() => handleTitleClick(u.id, u.title)}
                        >
                          DANH HIỆU
                        </button>
                        {u.role !== 'ADMIN' && (
                          <button
                            className={`btn btn-sm py-1.5 px-3 text-[10px] ${u.status === 'BANNED' ? 'btn-outline border-success text-success' : 'btn-danger'}`}
                            onClick={() => handleBanClick(u.id, u.status)}
                          >
                            {u.status === 'BANNED' ? 'MỞ KHÓA' : 'KHÓA'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ══ MODAL: BAN USER ══ */}
      {banModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={submitBanUser} className="modal-box border-danger" style={{ boxShadow: '12px 12px 0px 0px #93000a' }}>
            <h3 className="font-display-xl text-md font-bold text-danger mb-4 uppercase">
              KHÓA TÀI KHOẢN NGƯỜI DÙNG
            </h3>

            <div className="flex flex-col gap-4 mb-6">
              <div className="form-group">
                <label className="form-label text-danger">Lý do khóa tài khoản</label>
                <textarea
                  className="form-input focus:border-danger focus:shadow-[4px_4px_0px_0px_#93000a]"
                  placeholder="Nhập lý do chi tiết..."
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-danger">Thời hạn đình chỉ</label>
                <select
                  className="form-input focus:border-danger focus:shadow-[4px_4px_0px_0px_#93000a] bg-black text-on-surface"
                  value={banDuration}
                  onChange={e => setBanDuration(e.target.value)}
                >
                  <option value="1h">1 Giờ (Tạm thời)</option>
                  <option value="1d">1 Ngày (Tạm thời)</option>
                  <option value="7d">7 Ngày (Tạm thời)</option>
                  <option value="30d">30 Ngày (Tạm thời)</option>
                  <option value="permanent">Vĩnh viễn (Permanent)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBanModalOpen(false)}>
                HỦY
              </button>
              <button type="submit" className="btn btn-danger btn-sm">
                XÁC NHẬN KHÓA
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══ MODAL: CHANGE TITLE ══ */}
      {titleModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={submitChangeTitle} className="modal-box" style={{ boxShadow: '12px 12px 0px 0px #dab9ff' }}>
            <h3 className="font-display-xl text-md font-bold text-secondary mb-4 uppercase">
              THIẾT LẬP DANH HIỆU NGƯỜI DÙNG
            </h3>

            <div className="flex flex-col gap-4 mb-6">
              <div className="form-group">
                <label className="form-label text-secondary">Chọn danh hiệu mới</label>
                <select
                  className="form-input focus:border-secondary focus:shadow-[4px_4px_0px_0px_#dab9ff] bg-black text-on-surface"
                  value={selectedTitle}
                  onChange={e => setSelectedTitle(e.target.value)}
                >
                  <option value="TAN_TINH">⭐ Tân Tinh</option>
                  <option value="BACH_LOC">🦌 Bạch Lộc</option>
                  <option value="THUONG_LANG">🐺 Thương Lang</option>
                  <option value="KIM_O">🌟 Kim Ô</option>
                  <option value="XICH_HO">🦊 Xích Hồ</option>
                  <option value="TU_HIEU">🦅 Tử Hiêu</option>
                  <option value="CHU_PHUONG">🔥 Chu Phượng</option>
                  <option value="NGAN_LONG">🐉 Ngân Long</option>
                  <option value="SANG_THE">✨ Sáng Thế Thần Minh</option>
                  <option value="ADMIN">👑 Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTitleModalOpen(false)}>
                HỦY
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                LƯU THAY ĐỔI
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
