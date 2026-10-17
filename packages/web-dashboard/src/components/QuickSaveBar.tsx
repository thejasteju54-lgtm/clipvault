import React, { useState } from 'react';
import { Plus, Check, Zap, ZapOff, Sparkles, ClipboardPaste } from 'lucide-react';
import { syncClipboardElements, SyncResult } from '../services/clipboardSync';

interface QuickSaveBarProps {
  onSave: (text: string) => { isDuplicate: boolean };
  onSyncComplete: (result: SyncResult) => void;
  autoSync: boolean;
  onToggleAutoSync: () => void;
}

export const QuickSaveBar: React.FC<QuickSaveBarProps> = ({
  onSave,
  onSyncComplete,
  autoSync,
  onToggleAutoSync
}) => {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSave = (contentToSave: string) => {
    const trimmed = contentToSave.trim();
    if (!trimmed) return;

    const { isDuplicate } = onSave(trimmed);
    setText('');
    setFeedback(isDuplicate ? 'Refreshed' : 'Saved to vault');
    setTimeout(() => setFeedback(null), 2200);
  };

  const handlePasteOrSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncClipboardElements({ silent: false });
      onSyncComplete(result);
      setFeedback(result.summary);
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('Clipboard access required');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div style={{
        maxWidth: '840px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Single Integrated Input Bar */}
        <div style={{
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
            placeholder="Paste text, URL, note, or tap Sync..."
            style={{
              width: '100%',
              padding: '11px 14px',
              paddingRight: text.trim() ? '85px' : '95px',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              outline: 'none',
              transition: 'var(--transition-fast)'
            }}
          />

          {/* Action button inside input */}
          {text.trim() ? (
            <button
              type="button"
              onClick={() => handleSave(text)}
              style={{
                position: 'absolute',
                right: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              <Plus size={13} />
              <span>Save</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePasteOrSync}
              disabled={isSyncing}
              style={{
                position: 'absolute',
                right: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)'
              }}
              title="Paste from clipboard without opening keyboard"
            >
              <ClipboardPaste size={12} color="var(--color-primary)" />
              <span>{isSyncing ? 'Syncing...' : 'Paste'}</span>
            </button>
          )}
        </div>

        {/* Minimalist Sub-Bar: Auto-Sync & Sync Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px'
        }}>
          {/* Auto-Sync Pill */}
          <button
            type="button"
            onClick={onToggleAutoSync}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: autoSync ? 'var(--color-success-bg)' : 'var(--bg-canvas)',
              color: autoSync ? 'var(--color-success)' : 'var(--text-dim)',
              border: `1px solid ${autoSync ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
              fontSize: '11px',
              fontWeight: 600
            }}
            title="Auto-Sync saves clips whenever you return to this tab"
          >
            {autoSync ? <Zap size={11} /> : <ZapOff size={11} />}
            <span>Auto-Sync: {autoSync ? 'ON' : 'OFF'}</span>
          </button>

          {/* Direct 1-Tap Sync Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedback && (
              <span style={{
                color: 'var(--color-primary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <Check size={12} />
                <span>{feedback}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handlePasteOrSync}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-primary-border)'
              }}
            >
              <Sparkles size={12} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
