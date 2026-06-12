// src/components/Navbar.jsx

import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TitleBadge from './TitleBadge';
import { LogOut, User, Shield, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { isAuthenticated, dbUser, isAdmin, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/',         label: 'Trang Chủ'  },
    { to: '/download', label: 'Tải Xuống'  },
    { to: '/guide',    label: 'Hướng Dẫn'  },
    { to: '/pet-info', label: 'Pet Info'   },
    { to: '/community',label: 'Cộng Đồng'  },
    { to: '/contact',  label: 'Liên Hệ'    },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/');
  };

  const avatarLetter = dbUser?.username?.[0]?.toUpperCase() || '?';

  return (
    <nav className="navbar relative">
      <div className="navbar-inner font-label-mono">
        {/* Logo */}
        <Link to="/" className="navbar-logo text-tertiary" onClick={() => setIsOpen(false)}>
          ✦ PETWEB
        </Link>

        {/* Desktop Links */}
        <ul className="navbar-links flex-1 justify-center gap-4 flex">
          {links.map(l => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link ${isActive ? 'active font-bold' : ''}`}
                style={{ color: 'var(--secondary)' }}
              >
                <Shield size={12} className="inline mr-1" />
                Quản Trị
              </NavLink>
            </li>
          )}
        </ul>

        {/* Auth Section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* User Avatar + Info */}
              <Link
                to={dbUser ? `/user/${dbUser.id}` : '#'}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 no-underline border-2 border-transparent hover:border-tertiary p-1 transition-all max-w-[160px]"
              >
                <div className="relative flex-shrink-0">
                  <div className="avatar-placeholder avatar-sm w-7 h-7 font-bold flex items-center justify-center bg-black border border-secondary text-secondary text-xs">
                    {dbUser?.avatar ? (
                      <img src={dbUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      avatarLetter
                    )}
                  </div>
                  {dbUser?.totalExp !== undefined && (
                    <div className="absolute -bottom-1 -right-1 bg-secondary text-black font-bold text-[7px] px-1 font-label-mono leading-tight">
                      {dbUser.totalExp}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center leading-none min-w-0">
                  <span className="text-[11px] font-bold text-on-surface hover:text-tertiary transition-colors truncate">
                    {dbUser?.username || 'seeker_...'}
                  </span>
                  {dbUser?.title && (
                    <div className="mt-0.5">
                      <TitleBadge title={dbUser.title} size="sm" />
                    </div>
                  )}
                </div>
              </Link>

              <button
                onClick={handleSignOut}
                className="btn btn-ghost btn-sm btn-icon border border-outline-variant hover:border-error hover:text-error transition-all"
                title="Đăng xuất"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <User size={12} />
              Đăng Nhập
            </Link>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="navbar-toggle btn btn-ghost btn-sm btn-icon border border-outline-variant md:hidden flex items-center justify-center text-on-surface hover:text-tertiary"
            title="Menu"
          >
            {isOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {isOpen && (
        <div className="navbar-mobile-menu font-label-mono md:hidden border-t border-outline-variant bg-black">
          <ul className="flex flex-col gap-3 p-5 list-none">
            {links.map(l => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === '/'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `nav-link block py-2.5 px-3 border border-transparent ${isActive ? 'active bg-tertiary/10 border-tertiary text-tertiary' : 'hover:border-outline-variant'}`}
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            {isAdmin && (
              <li>
                <NavLink
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `nav-link block py-2.5 px-3 border border-transparent ${isActive ? 'active bg-secondary/10 border-secondary' : 'hover:border-outline-variant'}`}
                  style={{ color: 'var(--secondary)' }}
                >
                  <Shield size={12} className="inline mr-1.5" />
                  Quản Trị
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
}
