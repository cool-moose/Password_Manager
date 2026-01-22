import React, { useState, useRef } from 'react';
import { Moon, Sun, Clock, Download, Upload, Key, Shield, Lock, AlertTriangle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVault } from '../context/VaultContext';
import { useActivity } from '../context/ActivityContext';

const SettingsView: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  // Auto-lock now comes from ActivityContext
  const [showMasterPasswordForm, setShowMasterPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { passwords, refreshData } = useVault();
  const { autoLockMinutes, setAutoLockMinutes, addActivity } = useActivity();

  // Calculate security stats
  const weakPasswords = passwords.filter(p => p.password.length < 12);
  const reusedPasswords = passwords.filter((p, i, arr) =>
    arr.findIndex(x => x.password === p.password) !== i
  );
  const oldPasswords = passwords.filter(p => {
    const updated = new Date(p.updatedAt);
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 90;
  });

  const securityScore = Math.max(0, 100 - (weakPasswords.length * 15) - (reusedPasswords.length * 20) - (oldPasswords.length * 5));

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const csvContent = await window.electronAPI.exportCSV();

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vault_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Vault exported successfully!');
      addActivity('export', 'Vault Exported', `${passwords.length} passwords`);
    } catch (error) {
      toast.error('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const content = await file.text();
      const result = await window.electronAPI.importCSV(content);

      await refreshData();
      toast.success(`Imported ${result.imported} passwords${result.errors > 0 ? ` (${result.errors} errors)` : ''}`);
      addActivity('import', 'Passwords Imported', `${result.imported} passwords`);
    } catch (error) {
      toast.error('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleChangeMasterPassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // Password requirements - same as registration
    const hasGoodLength = newPassword.length >= 12;
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

    if (!hasGoodLength) {
      toast.error('New password must be at least 12 characters');
      return;
    }
    if (!hasLowercase || !hasUppercase) {
      toast.error('New password must contain uppercase and lowercase letters');
      return;
    }
    if (!hasNumber) {
      toast.error('New password must contain a number');
      return;
    }
    if (!hasSpecial) {
      toast.error('New password must contain a special character');
      return;
    }

    try {
      setIsLoading(true);
      const result = await window.electronAPI.changeMasterPassword(currentPassword, newPassword);

      if (result.success) {
        toast.success('Master password changed successfully!');
        setShowMasterPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to change password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Security Audit Section */}
      <section className="settings-section">
        <h2 className="settings-section-title">Security Audit</h2>

        {/* Overall Security Score */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `conic-gradient(
                ${securityScore >= 80 ? 'var(--success-color)' : securityScore >= 60 ? 'var(--accent-color)' : 'var(--warning-color)'} ${securityScore * 3.6}deg, 
                var(--border-color) ${securityScore * 3.6}deg
              )`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <span style={{
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: securityScore >= 80 ? 'var(--success-color)' : securityScore >= 60 ? 'var(--accent-color)' : 'var(--warning-color)'
                }}>
                  {securityScore}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                {securityScore >= 80 ? 'Excellent Security!' :
                  securityScore >= 60 ? 'Good Security' : 'Needs Improvement'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                {securityScore >= 80 ? 'Your vault is well-protected with strong, unique passwords.' :
                  securityScore >= 60 ? 'Your vault has some areas that could be improved.' :
                    'Consider updating weak or reused passwords for better security.'}
              </p>
            </div>
          </div>
        </div>

        {/* Security Issues */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: weakPasswords.length > 0 ? 'var(--danger-light)' : 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {weakPasswords.length > 0 ?
                  <AlertTriangle size={20} color="var(--danger-color)" /> :
                  <CheckCircle size={20} color="var(--success-color)" />
                }
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{weakPasswords.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Weak Passwords</div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: reusedPasswords.length > 0 ? 'var(--warning-light)' : 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {reusedPasswords.length > 0 ?
                  <AlertTriangle size={20} color="var(--warning-color)" /> :
                  <CheckCircle size={20} color="var(--success-color)" />
                }
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{reusedPasswords.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reused Passwords</div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: oldPasswords.length > 0 ? 'var(--warning-light)' : 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={20} color={oldPasswords.length > 0 ? 'var(--warning-color)' : 'var(--success-color)'} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{oldPasswords.length}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Old Passwords (90d+)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="glass-card" style={{ padding: '4px' }}>
          <div className="settings-item" style={{ marginBottom: '0' }}>
            <div className="settings-item-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {darkMode ? <Moon size={24} color="var(--accent-color)" /> : <Sun size={24} color="var(--warning-color)" />}
              <div>
                <h3>Dark Mode</h3>
                <p>Use dark theme for the interface</p>
              </div>
            </div>
            <div
              className={`toggle ${darkMode ? 'active' : ''}`}
              onClick={() => {
                setDarkMode(!darkMode);
                toast.success(darkMode ? 'Light mode enabled (mock)' : 'Dark mode enabled');
              }}
            />
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="settings-section">
        <h2 className="settings-section-title">Security</h2>
        <div className="glass-card" style={{ padding: '4px' }}>
          <div className="settings-item">
            <div className="settings-item-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Clock size={24} color="var(--accent-color)" />
              <div>
                <h3>Auto-Lock Timeout</h3>
                <p>Automatically lock vault after inactivity</p>
              </div>
            </div>
            <select
              className="input-field"
              value={autoLockMinutes}
              onChange={(e) => {
                setAutoLockMinutes(Number(e.target.value));
                toast.success(`Auto-lock set to ${e.target.value === '0' ? 'Never' : e.target.value + ' minutes'}`);
              }}
              style={{ width: 'auto', minWidth: '140px' }}
            >
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={0}>Never</option>
            </select>
          </div>

          <div className="settings-item" style={{ marginBottom: '0' }}>
            <div className="settings-item-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Key size={24} color="var(--accent-color)" />
              <div>
                <h3>Change Master Password</h3>
                <p>Update your vault's master password</p>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setShowMasterPasswordForm(!showMasterPasswordForm)}
            >
              {showMasterPasswordForm ? 'Cancel' : 'Change'}
            </button>
          </div>

          {showMasterPasswordForm && (
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="input-label">Current Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="input-field has-icon has-action"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="input-label">New Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="input-field has-icon has-action"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Requirements Checklist */}
                  {newPassword && (
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginTop: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {[
                        { met: newPassword.length >= 12, text: 'At least 12 characters' },
                        { met: /[a-z]/.test(newPassword), text: 'Lowercase letter (a-z)' },
                        { met: /[A-Z]/.test(newPassword), text: 'Uppercase letter (A-Z)' },
                        { met: /[0-9]/.test(newPassword), text: 'Number (0-9)' },
                        { met: /[^a-zA-Z0-9]/.test(newPassword), text: 'Special character (!@#$)' },
                      ].map((req, index) => (
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
                            <CheckCircle size={16} style={{ color: 'var(--success-color)' }} />
                          ) : (
                            <AlertTriangle size={16} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span>{req.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="input-label">Confirm New Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      className="input-field has-icon has-action"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    >
                      {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleChangeMasterPassword}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Data */}
      <section className="settings-section">
        <h2 className="settings-section-title">Data</h2>
        <div className="glass-card" style={{ padding: '4px' }}>
          <div className="settings-item">
            <div className="settings-item-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Download size={24} color="var(--success-color)" />
              <div>
                <h3>Export Vault</h3>
                <p>Download a CSV backup of your passwords</p>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleExport} disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
            </button>
          </div>
          <div className="settings-item" style={{ marginBottom: '0' }}>
            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv"
              onChange={handleFileSelect}
            />
            <div className="settings-item-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Upload size={24} color="var(--accent-color)" />
              <div>
                <h3>Import Passwords</h3>
                <p>Import from CSV or other password managers</p>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={handleImport} disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="settings-section">
        <h2 className="settings-section-title">About</h2>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'var(--gradient-primary)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} className="logo-glow">
              <Shield size={24} color="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>SecureVault Password Manager</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Version 1.0.0</p>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            A secure, offline-first password manager built with AES-256 encryption,
            PBKDF2 key derivation, and SRP-6a authentication protocol.
            Your passwords never leave your device unencrypted.
          </p>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            flexWrap: 'wrap'
          }}>
            <span className="security-badge">
              <Lock size={12} />
              AES-256-GCM
            </span>
            <span className="security-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: 'var(--accent-color)' }}>
              <Key size={12} />
              PBKDF2-SHA256
            </span>
            <span className="security-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)', color: '#a78bfa' }}>
              <Shield size={12} />
              SRP-6a
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
