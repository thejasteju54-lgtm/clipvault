import React from 'react';
import { ShieldCheck, HardDrive, Laptop, Download, Sun, Moon } from 'lucide-react';

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
      padding: '16px 24px',
      borderBottom: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-surface)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF'
        }}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>ClipVault</h1>
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontWeight: 600
            }}>
              v1.0.0
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Universal Clipboard Persistence & Cross-Device Sync
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Storage Stats badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-canvas)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <HardDrive size={14} color="var(--text-muted)" />
          <span style={{ fontWeight: 600 }}>{totalCount}</span>
          <span style={{ color: 'var(--text-muted)' }}>saved ({pinnedCount} pinned)</span>
        </div>

        {/* Devices button */}
        <button
          onClick={onOpenDevices}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            padding: '6px 14px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-main)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            transition: 'var(--transition-fast)'
          }}
          title="Manage Connected Devices"
        >
          <Laptop size={15} />
          <span>Devices</span>
        </button>

        {/* Export button */}
        <button
          onClick={onOpenExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            padding: '6px 14px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-main)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            transition: 'var(--transition-fast)'
          }}
          title="Export Vault History"
        >
          <Download size={15} />
          <span>Export</span>
        </button>

        {/* Theme Toggle button */}
        <button
          onClick={onToggleTheme}
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-subtle)'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};
