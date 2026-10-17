import React from 'react';
import { ShieldCheck, Laptop, Download, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  totalCount: number;
  pinnedCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenDevices: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  pinnedCount,
  theme,
  onToggleTheme,
  onOpenDevices,
  onOpenExport
}) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)'
    }}>
      {/* Brand & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-xs)',
          backgroundColor: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF'
        }}>
          <ShieldCheck size={16} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em' }}>ClipVault</h1>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-success)'
          }}
          title="Vault Active"
          />
        </div>
      </div>

      {/* Header Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onOpenDevices}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)'
          }}
          title="Devices"
        >
          <Laptop size={14} />
        </button>

        <button
          onClick={onOpenExport}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)'
          }}
          title="Export"
        >
          <Download size={14} />
        </button>

        <button
          onClick={onToggleTheme}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
};
