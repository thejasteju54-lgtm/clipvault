import React, { useState } from 'react';
import { X, FileCode, FileSpreadsheet, FileText, Check } from 'lucide-react';
import { vaultStorage } from '../services/vaultStorage';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (format: 'json' | 'csv' | 'markdown', filename: string) => {
    const data = vaultStorage.exportData(format);
    const mime = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown';
    const blob = new Blob([data], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedFormat(format);
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '480px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Export Vault History</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Download your clipboard archive in open standard formats
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Export Options */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* JSON */}
          <button
            onClick={() => handleDownload('json', 'clipvault-export.json')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              transition: 'var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileCode size={20} color="var(--color-primary)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>JSON Archive</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete structured backup with metadata & hashes</div>
              </div>
            </div>
            {downloadedFormat === 'json' ? <Check size={16} color="var(--color-primary)" /> : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>.json</span>}
          </button>

          {/* CSV */}
          <button
            onClick={() => handleDownload('csv', 'clipvault-export.csv')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              transition: 'var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileSpreadsheet size={20} color="var(--color-primary)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>CSV Spreadsheet</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Compatible with Excel, Sheets, and analytical tools</div>
              </div>
            </div>
            {downloadedFormat === 'csv' ? <Check size={16} color="var(--color-primary)" /> : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>.csv</span>}
          </button>

          {/* Markdown */}
          <button
            onClick={() => handleDownload('markdown', 'clipvault-export.md')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              transition: 'var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText size={20} color="var(--color-primary)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Markdown Notes</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Human-readable notes with code blocks & links</div>
              </div>
            </div>
            {downloadedFormat === 'markdown' ? <Check size={16} color="var(--color-primary)" /> : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>.md</span>}
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-main)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
