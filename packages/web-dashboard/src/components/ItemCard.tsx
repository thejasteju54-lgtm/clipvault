import React, { useState } from 'react';
import type { ClipboardItem } from '@clipvault/shared';
import { Copy, Check, Pin, Star, Trash2, ExternalLink, Smartphone, Monitor, Globe, CheckCircle2, Circle } from 'lucide-react';

interface ItemCardProps {
  item: ClipboardItem;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleOpened?: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  onToggleOpened
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(item.plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Fallback for insecure contexts
      const ta = document.createElement('textarea');
      ta.value = item.plainText;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    } catch {
      // Fallback
    }
  };

  const getDeviceIcon = () => {
    if (item.deviceId.includes('samsung') || item.deviceId.includes('android')) {
      return <Smartphone size={12} color="var(--text-muted)" />;
    }
    if (item.deviceId.includes('win') || item.deviceId.includes('desktop')) {
      return <Monitor size={12} color="var(--text-muted)" />;
    }
    return <Globe size={12} color="var(--text-muted)" />;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const isLink = item.contentType === 'url' || !!item.detectedUrl;
  const isOpened = !!item.isOpened;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${isLink && !isOpened ? 'var(--color-link-unopened-border)' : 'var(--border-subtle)'}`,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'var(--transition-fast)',
      position: 'relative'
    }}>
      {/* Top Meta Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Link Status Pill or Type Pill */}
          {isLink ? (
            <button
              type="button"
              onClick={() => onToggleOpened && onToggleOpened(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isOpened ? 'var(--color-link-opened-bg)' : 'var(--color-link-unopened-bg)',
                color: isOpened ? 'var(--color-link-opened)' : 'var(--color-link-unopened)',
                border: `1px solid ${isOpened ? 'var(--color-link-opened-border)' : 'var(--color-link-unopened-border)'}`,
                transition: 'var(--transition-fast)'
              }}
              title={isOpened ? 'Click to mark as unopened' : 'Click to mark as opened'}
            >
              {isOpened ? <CheckCircle2 size={10} /> : <Circle size={8} fill="currentColor" />}
              <span>{isOpened ? 'Opened' : 'Unopened'}</span>
            </button>
          ) : (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: item.contentType === 'code' ? 'rgba(123, 31, 162, 0.12)' : 'var(--bg-canvas)',
              color: item.contentType === 'code' ? '#A855F7' : 'var(--text-muted)'
            }}>
              {item.contentType.toUpperCase()}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {getDeviceIcon()}
            <span style={{ color: 'var(--text-muted)' }}>{item.deviceName}</span>
          </div>

          <span style={{ color: 'var(--text-dim)' }}>•</span>
          <span style={{ color: 'var(--text-dim)' }}>{formatTimestamp(item.capturedAt)}</span>
        </div>

        {/* Minimalist Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => onTogglePin(item.id)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: item.isPinned ? 'var(--color-primary)' : 'var(--text-dim)',
              backgroundColor: item.isPinned ? 'var(--color-primary-light)' : 'transparent'
            }}
            title={item.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin size={13} />
          </button>

          <button
            onClick={() => onToggleFavorite(item.id)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: item.isFavorite ? 'var(--color-warning)' : 'var(--text-dim)',
              backgroundColor: item.isFavorite ? 'var(--color-warning-bg)' : 'transparent'
            }}
            title={item.isFavorite ? 'Remove star' : 'Star'}
          >
            <Star size={13} />
          </button>

          <button
            onClick={handleCopy}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: copied ? 'var(--color-success)' : 'var(--bg-surface-elevated)',
              color: copied ? '#FFF' : 'var(--text-main)',
              border: '1px solid var(--border-subtle)'
            }}
            title="Copy to clipboard"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => onDelete(item.id)}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-dim)'
            }}
            title="Delete clip"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLink ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <a
            href={item.detectedUrl || item.plainText}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (onToggleOpened && !isOpened) {
                onToggleOpened(item.id);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: isOpened ? 400 : 600,
              color: isOpened ? 'var(--text-muted)' : 'var(--color-link-unopened)',
              textDecoration: isOpened ? 'none' : 'underline',
              textUnderlineOffset: '3px',
              wordBreak: 'break-all',
              lineHeight: 1.4
            }}
          >
            <span>{item.detectedUrl || item.plainText}</span>
            <ExternalLink size={13} style={{ flexShrink: 0, opacity: isOpened ? 0.6 : 1 }} />
          </a>
        </div>
      ) : item.contentType === 'code' ? (
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          padding: '10px 12px',
          backgroundColor: 'var(--bg-input)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          lineHeight: 1.5,
          color: 'var(--text-main)',
          maxHeight: '180px'
        }}>
          <code>{item.plainText}</code>
        </pre>
      ) : (
        <div style={{
          fontSize: '13.5px',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: '180px',
          overflowY: 'auto',
          color: 'var(--text-main)'
        }}>
          {item.plainText}
        </div>
      )}
    </div>
  );
};
