import React, { useState, useCallback } from 'react';
import { RefreshCw, Copy, Check, Sliders, Zap, Lock, Hash, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface PasswordGeneratorProps {
  onGenerate?: (password: string) => void;
  inline?: boolean;
}

type Preset = 'custom' | 'pin' | 'memorable' | 'strong' | 'maximum';

const PRESETS: Record<Preset, { length: number; upper: boolean; lower: boolean; numbers: boolean; symbols: boolean; label: string }> = {
  custom: { length: 16, upper: true, lower: true, numbers: true, symbols: true, label: 'Custom' },
  pin: { length: 6, upper: false, lower: false, numbers: true, symbols: false, label: 'PIN' },
  memorable: { length: 12, upper: true, lower: true, numbers: true, symbols: false, label: 'Memorable' },
  strong: { length: 16, upper: true, lower: true, numbers: true, symbols: true, label: 'Strong' },
  maximum: { length: 32, upper: true, lower: true, numbers: true, symbols: true, label: 'Maximum' },
};

// Calculate entropy in bits
const calculateEntropy = (length: number, charsetSize: number): number => {
  return Math.round(length * Math.log2(charsetSize));
};

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onGenerate, inline = false }) => {
  const [preset, setPreset] = useState<Preset>('strong');
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePassword = useCallback(() => {
    setIsGenerating(true);
    
    let chars = '';
    if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) chars += '0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    if (chars.length === 0) chars = 'abcdefghijklmnopqrstuvwxyz';
    
    let newPassword = '';
    for (let i = 0; i < length; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Animate the generation
    setTimeout(() => {
      setPassword(newPassword);
      setIsGenerating(false);
      if (onGenerate) onGenerate(newPassword);
    }, 150);
    
    return newPassword;
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, onGenerate]);

  // Generate initial password
  React.useEffect(() => {
    if (!password) {
      generatePassword();
    }
  }, []);

  const applyPreset = (presetKey: Preset) => {
    setPreset(presetKey);
    const p = PRESETS[presetKey];
    setLength(p.length);
    setIncludeUppercase(p.upper);
    setIncludeLowercase(p.lower);
    setIncludeNumbers(p.numbers);
    setIncludeSymbols(p.symbols);
    setTimeout(() => generatePassword(), 0);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Password copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate charset size and entropy
  let charsetSize = 0;
  if (includeUppercase) charsetSize += 26;
  if (includeLowercase) charsetSize += 26;
  if (includeNumbers) charsetSize += 10;
  if (includeSymbols) charsetSize += 28;
  if (charsetSize === 0) charsetSize = 26;
  
  const entropy = calculateEntropy(length, charsetSize);
  const entropyLevel = entropy < 40 ? 'weak' : entropy < 60 ? 'fair' : entropy < 80 ? 'good' : 'strong';

  const Option: React.FC<{ icon: React.ElementType; label: string; checked: boolean; onChange: () => void }> = 
    ({ icon: Icon, label, checked, onChange }) => (
    <label className="generator-option" onClick={onChange}>
      <div className={`generator-checkbox ${checked ? 'checked' : ''}`}>
        {checked && <Check size={14} color="white" />}
      </div>
      <Icon size={16} style={{ color: checked ? 'var(--accent-color)' : 'var(--text-muted)' }} />
      <span>{label}</span>
    </label>
  );

  // Color code password for display
  const renderColoredPassword = (pwd: string) => {
    return pwd.split('').map((char, index) => {
      let color = 'var(--text-primary)';
      if (/[A-Z]/.test(char)) color = '#60a5fa';
      else if (/[0-9]/.test(char)) color = '#4ade80';
      else if (/[^a-zA-Z0-9]/.test(char)) color = '#f472b6';
      return <span key={index} style={{ color }}>{char}</span>;
    });
  };

  return (
    <div className={`glass-card ${inline ? '' : 'animate-fade-in'}`} style={{ padding: inline ? '20px' : '32px' }}>
      {!inline && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--gradient-purple)', 
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sliders size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Password Generator</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Create strong, unique passwords
            </p>
          </div>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="preset-buttons">
        {(Object.keys(PRESETS) as Preset[]).map((key) => (
          <button
            key={key}
            className={`preset-btn ${preset === key ? 'active' : ''}`}
            onClick={() => applyPreset(key)}
          >
            {PRESETS[key].label}
          </button>
        ))}
      </div>

      {/* Password Output */}
      <div 
        className={`generator-output ${isGenerating ? 'shimmer' : ''}`}
        style={{ 
          fontFamily: "'Fira Code', 'Consolas', monospace",
          letterSpacing: '1px',
          wordBreak: 'break-all'
        }}
      >
        {renderColoredPassword(password)}
      </div>

      {/* Entropy Display */}
      <div className="entropy-display" style={{
        background: entropyLevel === 'strong' ? 'rgba(34, 197, 94, 0.1)' :
                   entropyLevel === 'good' ? 'rgba(59, 130, 246, 0.1)' :
                   entropyLevel === 'fair' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderColor: entropyLevel === 'strong' ? 'rgba(34, 197, 94, 0.2)' :
                    entropyLevel === 'good' ? 'rgba(59, 130, 246, 0.2)' :
                    entropyLevel === 'fair' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      }}>
        <Zap size={20} style={{ 
          color: entropyLevel === 'strong' ? 'var(--success-color)' :
                 entropyLevel === 'good' ? 'var(--accent-color)' :
                 entropyLevel === 'fair' ? 'var(--warning-color)' : 'var(--danger-color)'
        }} />
        <div>
          <div className="entropy-value" style={{
            color: entropyLevel === 'strong' ? 'var(--success-color)' :
                   entropyLevel === 'good' ? 'var(--accent-color)' :
                   entropyLevel === 'fair' ? 'var(--warning-color)' : 'var(--danger-color)'
          }}>
            {entropy} bits
          </div>
          <div className="entropy-label">
            {entropyLevel === 'strong' ? 'Excellent entropy - Very secure!' :
             entropyLevel === 'good' ? 'Good entropy - Secure' :
             entropyLevel === 'fair' ? 'Fair entropy - Consider longer' : 'Weak - Increase length or complexity'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', marginBottom: '24px' }}>
        <button 
          className={`btn btn-primary ${isGenerating ? 'shimmer' : ''}`} 
          style={{ flex: 1 }} 
          onClick={generatePassword}
          disabled={isGenerating}
        >
          <RefreshCw size={18} style={{ animation: isGenerating ? 'spin 0.5s linear' : 'none' }} />
          Regenerate
        </button>
        <button 
          className={`btn btn-secondary copy-btn ${copied ? 'copied' : ''}`} 
          style={{ flex: 1 }} 
          onClick={copyToClipboard}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Length Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Length</label>
          <span style={{ 
            color: 'var(--accent-color)', 
            fontWeight: '600',
            background: 'var(--accent-light)',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '0.85rem'
          }}>
            {length} characters
          </span>
        </div>
        <input 
          type="range" 
          min="4" 
          max="64" 
          value={length}
          onChange={(e) => {
            setLength(Number(e.target.value));
            setPreset('custom');
            setTimeout(generatePassword, 0);
          }}
          className="generator-slider"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>4</span>
          <span>64</span>
        </div>
      </div>

      {/* Character Options */}
      <div className="generator-options" style={{ marginTop: '20px' }}>
        <Option 
          icon={Hash}
          label="Uppercase (A-Z)" 
          checked={includeUppercase} 
          onChange={() => { 
            setIncludeUppercase(!includeUppercase); 
            setPreset('custom');
            setTimeout(generatePassword, 0); 
          }} 
        />
        <Option 
          icon={Hash}
          label="Lowercase (a-z)" 
          checked={includeLowercase} 
          onChange={() => { 
            setIncludeLowercase(!includeLowercase); 
            setPreset('custom');
            setTimeout(generatePassword, 0); 
          }} 
        />
        <Option 
          icon={Hash}
          label="Numbers (0-9)" 
          checked={includeNumbers} 
          onChange={() => { 
            setIncludeNumbers(!includeNumbers); 
            setPreset('custom');
            setTimeout(generatePassword, 0); 
          }} 
        />
        <Option 
          icon={Shield}
          label="Symbols (!@#$)" 
          checked={includeSymbols} 
          onChange={() => { 
            setIncludeSymbols(!includeSymbols); 
            setPreset('custom');
            setTimeout(generatePassword, 0); 
          }} 
        />
      </div>

      {onGenerate && (
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', marginTop: '16px' }}
          onClick={() => onGenerate(password)}
        >
          Use This Password
        </button>
      )}

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PasswordGenerator;
