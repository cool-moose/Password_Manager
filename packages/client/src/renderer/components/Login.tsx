import React, { useState } from 'react';
import { Shield, User, Lock, Eye, EyeOff, ArrowRight, Loader2, Fingerprint, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface LoginProps {
  onNavigate: (view: 'register' | 'dashboard') => void;
}

// Floating particles component
const Particles = () => (
  <div className="particles-bg">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
);

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      await login(username, password);
      toast.success('Welcome back!');
      onNavigate('dashboard');
    } catch (err: any) {
      // Clean up IPC error message - extract the actual error
      let message = err.message || 'Unknown error';
      // Remove "Error invoking remote method 'method': Error: " prefix
      const match = message.match(/Error:\s*(.+)$/);
      if (match) {
        message = match[1];
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container animated-gradient-bg">
      <Particles />

      <div className="glass-card auth-card animate-slide-up" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo with glow effect */}
        <div className="auth-logo">
          <div className="auth-logo-icon logo-glow">
            <Shield size={32} color="white" />
          </div>
          <span className="auth-logo-text gradient-text">SecureVault</span>
        </div>

        {/* Header */}
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Enter your credentials to unlock your vault</p>

        {/* Form */}
        <form onSubmit={handleLogin} className="auth-form">
          {/* Username */}
          <div>
            <label className="input-label">Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field has-icon"
                placeholder="Enter your username"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="input-label">Master Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field has-icon has-action"
                placeholder="••••••••••••"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <label
            className="checkbox-wrapper"
            onClick={() => setRememberMe(!rememberMe)}
            style={{ cursor: 'pointer' }}
          >
            <div className={`checkbox ${rememberMe ? 'checked' : ''}`}>
              {rememberMe && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Remember me for 30 days
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            className={`btn btn-primary btn-lg ${isLoading ? 'shimmer' : ''}`}
            disabled={isLoading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                Unlock Vault
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="secure-badge">
          <ShieldCheck size={16} />
          <span>Protected by AES-256 & SRP-6a</span>
        </div>

        {/* Footer */}
        <p className="auth-footer">
          Don't have an account?{' '}
          <span className="auth-link" onClick={() => onNavigate('register')}>
            Create one
          </span>
        </p>
      </div>

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
