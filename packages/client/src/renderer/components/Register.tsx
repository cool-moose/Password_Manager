import React, { useState, useMemo, useEffect } from 'react';
import { Shield, User, Lock, Eye, EyeOff, ArrowRight, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Floating particles component (same as Login.tsx)
const Particles = () => (
  <div className="particles-bg">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
);

interface RegisterProps {
  onNavigate: (view: 'login') => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Password strength calculation - requires ALL criteria for Strong
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: '', class: '' };

    const hasMinLength = password.length >= 8;
    const hasGoodLength = password.length >= 12;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    // Count met criteria
    let score = 0;
    if (hasMinLength) score++;
    if (hasGoodLength) score++;
    if (hasLowercase) score++;
    if (hasUppercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    // Strong requires ALL: 12+ chars, lowercase, uppercase, number, AND special char
    if (hasGoodLength && hasLowercase && hasUppercase && hasNumber && hasSpecial) {
      return { level: 4, label: 'Strong', class: 'strong' };
    }
    // Good requires 12+ chars and 3 of 4 character types
    if (hasGoodLength && score >= 5) {
      return { level: 3, label: 'Good', class: 'good' };
    }
    // Fair requires 8+ chars and 2 character types
    if (hasMinLength && score >= 3) {
      return { level: 2, label: 'Fair', class: 'fair' };
    }
    return { level: 1, label: 'Weak', class: 'weak' };
  }, [password]);

  // Password requirements
  const requirements = [
    { met: password.length >= 12, text: 'At least 12 characters' },
    { met: /[a-z]/.test(password), text: 'Lowercase letter (a-z)' },
    { met: /[A-Z]/.test(password), text: 'Uppercase letter (A-Z)' },
    { met: /[0-9]/.test(password), text: 'Number (0-9)' },
    { met: /[^a-zA-Z0-9]/.test(password), text: 'Special character (!@#$)' },
  ];

  // Check if ALL requirements are met
  const allRequirementsMet = requirements.every(r => r.met);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Require ALL password requirements to be met
    if (!allRequirementsMet) {
      toast.error('Password must meet all requirements');
      return;
    }

    if (!acceptTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      await window.electronAPI.register(username, password);
      toast.success('Account created successfully!');
      // Auto login after registration
      await login(username, password);
      onNavigate('login');
    } catch (err: any) {
      // Clean up IPC error message
      let message = err.message || 'Registration failed';
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
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon logo-glow">
            <Shield size={32} color="white" />
          </div>
          <span className="auth-logo-text gradient-text">SecureVault</span>
        </div>

        {/* Header */}
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Start securing your passwords today</p>

        {/* Form */}
        <form onSubmit={handleRegister} className="auth-form">
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
                placeholder="Choose a username"
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
                placeholder="Create a strong password"
                disabled={isLoading}
                autoComplete="new-password"
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

            {/* Password Strength */}
            {password && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${passwordStrength.class}`} />
                </div>
                <div className={`password-strength-text ${passwordStrength.class}`}>
                  <span>{passwordStrength.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Password Requirements */}
          {password && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {requirements.map((req, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.85rem',
                    color: req.met ? 'var(--success-color)' : 'var(--text-muted)'
                  }}
                >
                  {req.met ? (
                    <Check size={16} style={{ color: 'var(--success-color)' }} />
                  ) : (
                    <X size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span>{req.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <label className="input-label">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field has-icon has-action"
                placeholder="Repeat your password"
                disabled={isLoading}
                autoComplete="new-password"
                style={{
                  borderColor: confirmPassword && confirmPassword !== password
                    ? 'var(--danger-color)'
                    : confirmPassword && confirmPassword === password
                      ? 'var(--success-color)'
                      : undefined
                }}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '8px' }}>
                Passwords do not match
              </p>
            )}
          </div>

          {/* Terms */}
          <label
            className="checkbox-wrapper"
            onClick={() => setAcceptTerms(!acceptTerms)}
            style={{ cursor: 'pointer' }}
          >
            <div className={`checkbox ${acceptTerms ? 'checked' : ''}`}>
              {acceptTerms && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              I agree to the Terms of Service and Privacy Policy
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
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="auth-footer">
          Already have an account?{' '}
          <span className="auth-link" onClick={() => onNavigate('login')}>
            Sign in
          </span>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
