import React, { useState } from 'react';
import { ClipboardPaste, Plus, Check, Zap, ZapOff, Sparkles, Images } from 'lucide-react';
import { syncClipboardElements, SyncResult } from '../services/clipboardSync';

interface QuickSaveBarProps {
  onSave: (text: string) => { isDuplicate: boolean };
  onSyncComplete: (result: SyncResult) => void;
  autoSync: boolean;
  onToggleAutoSync: () => void;
  onOpenBatchModal: () => void;
}

export const QuickSaveBar: React.FC<QuickSaveBarProps> = ({
  onSave,
  onSyncComplete,
  autoSync,
  onToggleAutoSync,
  onOpenBatchModal
}) => {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSave = (contentToSave: string) => {
    const trimmed = contentToSave.trim();
    if (!trimmed) return;

    const { isDuplicate } = onSave(trimmed);
    setText('');
    setFeedback(isDuplicate ? 'Duplicate refreshed!' : 'Saved to vault!');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handlePasteFromClipboard = async () => {
    setIsSyncing(true);
    try {
      const result = await syncClipboardElements({ silent: false });
      onSyncComplete(result);
      setFeedback(result.summary);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback('Clipboard access requires browser permission');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{
      padding: '16px 24px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        maxWidth: '840px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Input & Action Row */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{
            flex: '1 1 300px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <input
              id="quick-save-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave(text);
                }
              }}
              placeholder="Paste text, URL, code, or click Sync Clipboard..."
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: '105px',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                outline: 'none',
                transition: 'var(--transition-fast)'
              }}
            />
            {/* Quick paste button inside input (never pops up keyboard) */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              disabled={isSyncing}
              style={{
                position: 'absolute',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                opacity: isSyncing ? 0.6 : 1
              }}
              title="Read text or screenshots from clipboard"
            >
              <ClipboardPaste size={13} color="var(--color-primary)" />
              <span>{isSyncing ? 'Syncing...' : 'Paste'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Save Clip Button */}
            <button
              type="button"
              onClick={() => handleSave(text)}
              disabled={!text.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                backgroundColor: text.trim() ? 'var(--color-primary)' : 'var(--border-subtle)',
                color: text.trim() ? '#FFF' : 'var(--text-dim)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} />
              <span>Save Clip</span>
            </button>

            {/* 1-Click Sync All Button */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              disabled={isSyncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
              title="Sync all clipboard items (text, screenshots, links) at once"
            >
              <Sparkles size={16} />
              <span>{isSyncing ? 'Syncing...' : '1-Click Sync'}</span>
            </button>

            {/* Bulk Sync (30-40 Clips / Screenshots) */}
            <button
              type="button"
              onClick={onOpenBatchModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
              title="Sync all 30-40 screenshots, links, and text clips from your phone"
            >
              <Images size={16} color="var(--color-primary)" />
              <span>Bulk Sync (30+ Clips)</span>
            </button>
          </div>
        </div>

        {/* Status & Auto-Sync Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '4px'
        }}>
          {/* Auto-Sync Toggle Pill */}
          <button
            type="button"
            onClick={onToggleAutoSync}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: autoSync ? 'var(--color-success-bg)' : 'var(--bg-canvas)',
              color: autoSync ? 'var(--color-success)' : 'var(--text-muted)',
              border: `1px solid ${autoSync ? 'rgba(46, 125, 50, 0.3)' : 'var(--border-subtle)'}`,
              transition: 'var(--transition-fast)'
            }}
            title="Automatically sync clipboard items when you switch back to this tab"
          >
            {autoSync ? <Zap size={13} /> : <ZapOff size={13} />}
            <span>Auto-Sync: {autoSync ? 'ON (Syncs on app switch)' : 'OFF (Manual only)'}</span>
          </button>

          {/* Feedback Status */}
          {feedback && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--color-primary)',
              fontWeight: 600
            }}>
              <Check size={14} />
              <span>{feedback}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
