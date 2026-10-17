import React, { useState } from 'react';
import type { ClipboardItem } from '@clipvault/shared';
import { Copy, Check, Pin, Star, Trash2, ExternalLink, Smartphone, Monitor, Globe } from 'lucide-react';

interface ItemCardProps {
  item: ClipboardItem;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onTogglePin,
  onToggleFavorite,
  onDelete
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (item.contentType === 'image' && item.attachmentUrl) {
        try {
          const res = await fetch(item.attachmentUrl);
          const blob = await res.blob();
          if (typeof window !== 'undefined' && 'ClipboardItem' in window) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ [blob.type]: blob })
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return;
          }
        } catch {
          // Fallback to text copy
        }
      }
      await navigator.clipboard.writeText(item.plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getDeviceIcon = () => {
    if (item.deviceId.includes('samsung') || item.deviceId.includes('android')) {
      return <Smartphone size={13} color="var(--text-muted)" />;
    }
    if (item.deviceId.includes('win') || item.deviceId.includes('desktop')) {
      return <Monitor size={13} color="var(--text-muted)" />;
    }
    return <Globe size={13} color="var(--text-muted)" />;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'var(--transition-fast)'
    }}>
      {/* Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)'
          }}>
            {item.contentType.toUpperCase()}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {getDeviceIcon()}
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              {item.deviceName}
            </span>
          </div>

          <span style={{ color: 'var(--text-dim)' }}>•</span>
          <span style={{ color: 'var(--text-dim)' }}>{formatTimestamp(item.capturedAt)}</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => onTogglePin(item.id)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: item.isPinned ? 'var(--color-primary)' : 'var(--text-dim)',
              backgroundColor: item.isPinned ? 'var(--color-primary-light)' : 'transparent',
              transition: 'var(--transition-fast)'
            }}
            title={item.isPinned ? 'Unpin item' : 'Pin to top'}
          >
            <Pin size={14} />
          </button>

          <button
            onClick={() => onToggleFavorite(item.id)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: item.isFavorite ? 'var(--color-primary)' : 'var(--text-dim)',
              backgroundColor: item.isFavorite ? 'var(--color-primary-light)' : 'transparent',
              transition: 'var(--transition-fast)'
            }}
            title={item.isFavorite ? 'Remove favorite' : 'Add to favorites'}
          >
            <Star size={14} />
          </button>

          <button
            onClick={handleCopy}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: copied ? 'var(--color-primary)' : 'var(--bg-surface-elevated)',
              color: copied ? '#FFF' : 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              transition: 'var(--transition-fast)'
            }}
            title="Copy to clipboard"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => onDelete(item.id)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-dim)',
              transition: 'var(--transition-fast)'
            }}
            title="Delete from vault"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {item.contentType === 'image' && item.attachmentUrl ? (
        <div style={{
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          maxHeight: '280px',
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: '#000'
        }}>
          <img
            src={item.attachmentUrl}
            alt="Clipboard screenshot capture"
            style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }}
          />
        </div>
      ) : item.contentType === 'code' ? (
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          padding: '12px',
          backgroundColor: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          lineHeight: 1.6,
          color: 'var(--text-main)',
          maxHeight: '240px'
        }}>
          <code>{item.plainText}</code>
        </pre>
      ) : (
        <div style={{
          fontSize: '14px',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {item.plainText}
        </div>
      )}

      {/* URL Link preview */}
      {item.detectedUrl && (
        <a
          href={item.detectedUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          <ExternalLink size={12} />
          <span>{item.detectedUrl}</span>
        </a>
      )}
    </div>
  );
};
