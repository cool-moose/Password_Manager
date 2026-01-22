import React, { useState } from 'react';
import { X, Globe, User, Lock, FileText, Star, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { PasswordEntry, useVault } from '../context/VaultContext';
import { useActivity } from '../context/ActivityContext';
import toast from 'react-hot-toast';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  editEntry?: PasswordEntry | null;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, editEntry }) => {
  const { addPassword, updatePassword, categories } = useVault();
  const { addActivity } = useActivity();
  const isEdit = !!editEntry;

  const [formData, setFormData] = useState({
    site: editEntry?.site || '',
    username: editEntry?.username || '',
    password: editEntry?.password || '',
    note: editEntry?.note || '',
    category: editEntry?.category || categories[0] || 'General',
    favorite: editEntry?.favorite || false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    toast.success('Password generated!');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.site || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isEdit && editEntry) {
      updatePassword(editEntry.id, formData);
      toast.success('Password updated successfully!');
      addActivity('edit', 'Password Updated', formData.site);
    } else {
      addPassword(formData);
      toast.success('Password added successfully!');
      addActivity('add', 'Password Added', formData.site);
    }

    onClose();
  };

  if (!isOpen) return null;

  const allCategories = [...new Set([...categories, 'General', 'Development', 'Email', 'Entertainment', 'Finance', 'Social'])];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Password' : 'Add New Password'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Site */}
            <div>
              <label className="input-label">Website / App</label>
              <div className="input-wrapper">
                <Globe size={18} className="input-icon" />
                <input
                  type="text"
                  className="input-field has-icon"
                  placeholder="e.g., github.com"
                  value={formData.site}
                  onChange={e => setFormData(prev => ({ ...prev, site: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="input-label">Username / Email</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="input-field has-icon"
                  placeholder="e.g., user@example.com"
                  value={formData.username}
                  onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field has-icon has-action"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  style={{ paddingRight: '90px' }}
                />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    style={{ width: '36px', height: '36px' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    style={{ width: '36px', height: '36px' }}
                    onClick={generatePassword}
                    title="Generate password"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="input-label">Category</label>
              <select
                className="input-field"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                style={{ cursor: 'pointer' }}
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="input-label">Notes (optional)</label>
              <div className="input-wrapper">
                <FileText size={18} className="input-icon" style={{ top: '20px', transform: 'none' }} />
                <textarea
                  className="input-field has-icon"
                  placeholder="Add any additional notes..."
                  value={formData.note}
                  onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
            </div>

            {/* Favorite */}
            <label
              className="checkbox-wrapper"
              onClick={() => setFormData(prev => ({ ...prev, favorite: !prev.favorite }))}
              style={{ cursor: 'pointer' }}
            >
              <div className={`checkbox ${formData.favorite ? 'checked' : ''}`}>
                {formData.favorite && <Star size={12} color="white" fill="white" />}
              </div>
              <span>Mark as Favorite</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save Changes' : 'Add Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;
