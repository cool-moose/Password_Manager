import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Key,
  Star,
  Folder,
  Sliders,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

type View = 'passwords' | 'favorites' | 'generator' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

// Category icon colors
const getCategoryColor = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('dev')) return '#a78bfa';
  if (cat.includes('email')) return '#60a5fa';
  if (cat.includes('entertainment')) return '#f472b6';
  if (cat.includes('finance')) return '#4ade80';
  if (cat.includes('social')) return '#fbbf24';
  return 'var(--text-muted)';
};

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  selectedCategory,
  onCategoryChange,
  onLogout,
  isOpen = false,
  onClose
}) => {
  const { username, logout } = useAuth();
  const { passwords, categories, refreshData } = useVault();

  const favoritesCount = passwords.filter(p => p.favorite).length;
  const weakCount = passwords.filter(p => p.password.length < 12).length;

  // Sync state with unmount protection
  const [isSyncing, setIsSyncing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const navItems = [
    { id: 'passwords' as View, icon: Key, label: 'All Passwords', count: passwords.length },
    { id: 'favorites' as View, icon: Star, label: 'Favorites', count: favoritesCount },
    { id: 'generator' as View, icon: Sliders, label: 'Generator' },
    { id: 'settings' as View, icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--gradient-primary)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }} className="logo-glow">
            <Shield size={22} color="white" />
          </div>
          <span className="gradient-text">SecureVault</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ padding: '0 16px' }}>
        <div className="quick-stats">
          <div className="quick-stat">
            <div className="quick-stat-value">{passwords.length}</div>
            <div className="quick-stat-label">Total</div>
          </div>
          <div className="quick-stat">
            <div className="quick-stat-value" style={{ color: 'var(--success-color)' }}>
              {passwords.length - weakCount}
            </div>
            <div className="quick-stat-label">Strong</div>
          </div>
          <div className="quick-stat">
            <div className="quick-stat-value" style={{ color: weakCount > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
              {weakCount}
            </div>
            <div className="quick-stat-label">Weak</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Menu</div>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => {
                onViewChange(item.id);
                if (item.id !== 'passwords') onCategoryChange(null);
              }}
            >
              <item.icon size={20} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count !== undefined && (
                <span style={{
                  fontSize: '0.75rem',
                  background: currentView === item.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}>
                  {item.count}
                </span>
              )}
              {currentView === item.id && (
                <ChevronRight size={16} style={{ opacity: 0.5 }} />
              )}
            </button>
          ))}
        </div>

        {/* Categories */}
        {currentView === 'passwords' && categories.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Categories</div>
            <button
              className={`sidebar-item ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => onCategoryChange(null)}
            >
              <Folder size={20} />
              <span>All Categories</span>
            </button>
            {categories.map(category => {
              const count = passwords.filter(p => p.category === category).length;
              const color = getCategoryColor(category);
              return (
                <button
                  key={category}
                  className={`sidebar-item ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => onCategoryChange(category)}
                >
                  <Folder size={20} style={{ color }} />
                  <span style={{ flex: 1 }}>{category}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Security Tip */}
        <div style={{
          margin: '16px 8px',
          padding: '16px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={16} color="var(--accent-color)" />
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-color)' }}>
              Pro Tip
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
            Use unique passwords for each account and enable 2FA when available.
          </p>
        </div>
      </nav>

      {/* User & Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={username || 'User'} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {username || 'User'}
            </div>
            <div className="sidebar-user-email" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                background: 'var(--success-color)',
                borderRadius: '50%',
                display: 'inline-block'
              }} />
              Vault secured
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={async () => {
              if (isSyncing) return;
              setIsSyncing(true);
              try {
                const result = await window.electronAPI.sync();
                if (!isMountedRef.current) return;
                if (result.success) {
                  toast.success(result.message);
                  await refreshData();
                } else {
                  toast.error(result.message);
                }
              } catch (error) {
                if (isMountedRef.current) {
                  toast.error('Sync failed');
                }
              } finally {
                if (isMountedRef.current) {
                  setIsSyncing(false);
                }
              }
            }}
            title={isSyncing ? 'Synchronizing...' : 'Sync with server'}
            style={{ color: 'var(--accent-color)' }}
            disabled={isSyncing}
          >
            <RefreshCw
              size={18}
              style={{
                animation: isSyncing ? 'spin 1s linear infinite' : 'none'
              }}
            />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onLogout}
            title="Logout"
            style={{ color: 'var(--danger-color)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
