import React, { useState } from 'react';
import { ClipboardPaste, Plus, Check } from 'lucide-react';

interface QuickSaveBarProps {
  onSave: (text: string) => { isDuplicate: boolean };
}

export const QuickSaveBar: React.FC<QuickSaveBarProps> = ({ onSave }) => {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = (contentToSave: string) => {
    const trimmed = contentToSave.trim();
    if (!trimmed) return;

    const { isDuplicate } = onSave(trimmed);
    setText('');
    setFeedback(isDuplicate ? 'Duplicate refreshed!' : 'Saved to vault!');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          handleSave(clipText);
        }
      }
    } catch {
      // If browser permission denied, focus the input
      document.getElementById('quick-save-input')?.focus();
    }
  };

  return (
    <div style={{
      padding: '20px 24px',
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
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <div style={{
            flex: 1,
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
              placeholder="Paste text, URL, SQL, JSON, or code snippet to ingest..."
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: '110px',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                outline: 'none',
                transition: 'var(--transition-fast)'
              }}
            />
            {/* Quick paste button */}
            <button
              onClick={handlePasteFromClipboard}
              style={{
                position: 'absolute',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
              title="Read from browser clipboard"
            >
              <ClipboardPaste size={13} />
              <span>Paste</span>
            </button>
          </div>

          <button
            onClick={() => handleSave(text)}
            disabled={!text.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 20px',
              backgroundColor: text.trim() ? 'var(--color-primary)' : 'var(--border-subtle)',
              color: text.trim() ? '#FFF' : 'var(--text-dim)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              transition: 'var(--transition-fast)'
            }}
          >
            <Plus size={16} />
            <span>Save Clip</span>
          </button>
        </div>

        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--color-primary)',
            fontWeight: 500
          }}>
            <Check size={14} />
            <span>{feedback}</span>
          </div>
        )}
      </div>
    </div>
  );
};
