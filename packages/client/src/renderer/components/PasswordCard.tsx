import React, { useState } from 'react';
import { Copy, Eye, EyeOff, Edit, Trash2, Star, Check, ExternalLink, Clock } from 'lucide-react';
import { PasswordEntry } from '../context/VaultContext';
import { useActivity } from '../context/ActivityContext';
import toast from 'react-hot-toast';

interface PasswordCardProps {
  entry: PasswordEntry;
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

// Calculate password strength
const getPasswordStrength = (password: string): { level: string; score: number } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', score };
  if (score <= 4) return { level: 'fair', score };
  if (score <= 6) return { level: 'good', score };
  return { level: 'strong', score };
};

// Get category class
const getCategoryClass = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('dev') || cat.includes('code')) return 'development';
  if (cat.includes('email') || cat.includes('mail')) return 'email';
  if (cat.includes('entertainment') || cat.includes('stream')) return 'entertainment';
  if (cat.includes('finance') || cat.includes('bank')) return 'finance';
  if (cat.includes('social')) return 'social';
  return '';
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

const PasswordCard: React.FC<PasswordCardProps> = ({ entry, onEdit, onDelete, onToggleFavorite }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addActivity } = useActivity();

  // Pobierz pierwszą literę domeny jako favicon placeholder
  const getFaviconLetter = (site: string) => {
    return site.replace(/^(https?:\/\/)?(www\.)?/, '').charAt(0).toUpperCase();
  };

  // Gradient bazowany na pierwszej literze
  const getGradient = (letter: string) => {
    const gradients: Record<string, string> = {
      'A': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'B': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'C': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'D': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'E': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'F': 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'G': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'H': 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
      'I': 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
      'J': 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
      'K': 'linear-gradient(135deg, #cd9cf2 0%, #f6f3ff 100%)',
      'L': 'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
      'M': 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'N': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      'O': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'P': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'Q': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'R': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'S': 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
      'T': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'U': 'linear-gradient(135deg, #ff8177 0%, #b12a5b 100%)',
      'V': 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
      'W': 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)',
      'X': 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)',
      'Y': 'linear-gradient(135deg, #e8198b 0%, #c7eafd 100%)',
      'Z': 'linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%)',
    };
    return gradients[letter] || 'var(--gradient-primary)';
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(entry.password);
    setCopied(true);
    toast.success('Password copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyUsername = async () => {
    await navigator.clipboard.writeText(entry.username);
    toast.success('Username copied!');
  };

  const letter = getFaviconLetter(entry.site);
  const strength = getPasswordStrength(entry.password);
  const categoryClass = getCategoryClass(entry.category);

  // Color code password characters
  const renderColoredPassword = (password: string) => {
    return password.split('').map((char, index) => {
      let className = 'char-lower';
      if (/[A-Z]/.test(char)) className = 'char-upper';
      else if (/[0-9]/.test(char)) className = 'char-number';
      else if (/[^a-zA-Z0-9]/.test(char)) className = 'char-symbol';
      return <span key={index} className={className}>{char}</span>;
    });
  };

  return (
    <div className="password-card glass-card-hover">
      {/* Header */}
      <div className="password-card-header">
        <div
          className="password-card-favicon"
          style={{ background: getGradient(letter) }}
        >
          {letter}
        </div>
        <div className="password-card-info">
          <div className="password-card-site" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {entry.site}
            {/* Strength indicator dot */}
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: strength.level === 'strong' ? 'var(--success-color)' :
                  strength.level === 'good' ? 'var(--accent-color)' :
                    strength.level === 'fair' ? 'var(--warning-color)' : 'var(--danger-color)'
              }}
              title={`Password strength: ${strength.level}`}
            />
          </div>
          <div
            className="password-card-username"
            onClick={copyUsername}
            style={{ cursor: 'pointer' }}
            title="Click to copy username"
          >
            {entry.username}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => onToggleFavorite(entry.id)}
          style={{ color: entry.favorite ? 'var(--warning-color)' : 'var(--text-muted)' }}
        >
          <Star size={18} fill={entry.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Category Tag */}
      <div style={{ marginBottom: '12px' }}>
        <span className={`category-tag ${categoryClass}`}>
          {entry.category}
        </span>
      </div>

      {/* Password */}
      <div className="password-card-password password-colored">
        <span>
          {showPassword ? renderColoredPassword(entry.password) : '••••••••••••'}
        </span>
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: '32px', height: '32px' }}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Strength Bar */}
      <div className={`strength-bar ${strength.level}`}>
        <div className="strength-segment" />
        <div className="strength-segment" />
        <div className="strength-segment" />
        <div className="strength-segment" />
      </div>

      {/* Note & Last Updated */}
      <div style={{ marginTop: '12px', marginBottom: '16px' }}>
        {entry.note && (
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {entry.note}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          Updated {formatRelativeTime(entry.updatedAt)}
        </div>
      </div>

      {/* Actions */}
      <div className="password-card-actions">
        <button
          className={`btn btn-secondary btn-sm copy-btn ${copied ? 'copied' : ''}`}
          onClick={copyPassword}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(entry)}>
          <Edit size={14} />
          Edit
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--danger-color)' }}
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this password?')) {
              onDelete(entry.id);
              addActivity('delete', 'Password Deleted', entry.site);
              toast.success('Password deleted');
            }
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default PasswordCard;
