import React, { useState, useRef } from 'react';
import { X, Images, Layers, Sparkles, Check, Upload, AlertCircle } from 'lucide-react';
import { ingestFiles, ingestBatchText, SyncResult } from '../services/clipboardSync';
import { vaultStorage } from '../services/vaultStorage';

interface BatchIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: (result: SyncResult) => void;
}

export const BatchIngestModal: React.FC<BatchIngestModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'rapid' | 'batch_text'>('gallery');
  const [rapidClipsCount, setRapidClipsCount] = useState(0);
  const [batchText, setBatchText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setStatusMessage(`Ingesting ${files.length} screenshots...`);
    try {
      const result = await ingestFiles(files);
      onSyncComplete(result);
      setStatusMessage(`Success: Ingested ${result.items.length} items to your vault!`);
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } catch {
      setStatusMessage('Error processing some files');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRapidInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && text.trim()) {
      const { item, isDuplicate } = vaultStorage.saveItem({
        plainText: text.trim(),
        sourceApp: 'Samsung Clipboard Tray'
      });
      try {
        navigator.vibrate?.(35);
      } catch {}

      setRapidClipsCount((prev) => prev + 1);
      setStatusMessage(`Captured: "${text.trim().slice(0, 28)}..."`);
      onSyncComplete({
        success: true,
        addedCount: isDuplicate ? 0 : 1,
        refreshedCount: isDuplicate ? 1 : 0,
        items: [item],
        summary: `Captured clip #${rapidClipsCount + 1}`
      });

      // Clear input so next tap is clean
      setTimeout(() => {
        if (e.target) {
          (e.target as HTMLInputElement).value = '';
        }
      }, 50);
    }
  };

  const handleBatchTextIngest = () => {
    if (!batchText.trim()) return;
    setIsProcessing(true);
    try {
      const result = ingestBatchText(batchText);
      onSyncComplete(result);
      setBatchText('');
      setStatusMessage(result.summary);
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Bulk Clipboard Sync</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Sync all 30-40 screenshots, links, and text clips from your phone
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-dim)',
              backgroundColor: 'var(--bg-surface-elevated)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-canvas)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: activeTab === 'gallery' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'gallery' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <Images size={15} />
            <span>All Screenshots</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rapid')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: activeTab === 'rapid' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'rapid' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <Sparkles size={15} />
            <span>Rapid Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch_text')}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: activeTab === 'batch_text' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'batch_text' ? '2px solid var(--color-primary)' : 'none'
            }}
          >
            <Layers size={15} />
            <span>Multi-Text Split</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'gallery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div style={{
                padding: '32px 20px',
                border: '2px dashed var(--color-primary-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-light)',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} color="var(--color-primary)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                  Select All Screenshots from Phone
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px auto' }}>
                  Tap here to open your phone gallery. You can multi-select all 30-40 screenshots at once to ingest them simultaneously!
                </p>
                <button
                  type="button"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFF',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  Choose Screenshots (Multi-Select)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'left',
                backgroundColor: 'var(--bg-canvas)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)'
              }}>
                <AlertCircle size={15} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span>
                  Tip: Android allows selecting multiple screenshots at once from the recent Screenshots album.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'rapid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '14px',
                backgroundColor: 'var(--bg-canvas)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--text-main)'
              }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>How to stream all Samsung clipboard items:</p>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Tap the input box below to bring up your keyboard.</li>
                  <li>Tap the <strong>Clipboard icon</strong> in your Samsung keyboard toolbar.</li>
                  <li>Tap each clip in your clipboard tray: 1, 2, 3... Each tap is saved instantly!</li>
                </ol>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  STREAM TARGET (Tap clips in Samsung Clipboard tray)
                </label>
                <input
                  type="text"
                  placeholder="Focus here and tap clips from keyboard clipboard tray..."
                  onPaste={handleRapidInputPaste}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      vaultStorage.saveItem({ plainText: val, sourceApp: 'Samsung Clipboard Tray' });
                      setRapidClipsCount((prev) => prev + 1);
                      try { navigator.vibrate?.(35); } catch {}
                      e.target.value = '';
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    border: '2px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--color-primary-light)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary-border)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>
                  Clips captured this session:
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {rapidClipsCount}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'batch_text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Paste multi-line text, links, or notes. Each line or URL will be ingested as an individual item:
              </p>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={6}
                placeholder="Paste multiple links or lines here:&#10;https://example.com/one&#10;https://example.com/two&#10;Important note..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
              <button
                type="button"
                onClick={handleBatchTextIngest}
                disabled={!batchText.trim() || isProcessing}
                style={{
                  padding: '12px 20px',
                  backgroundColor: batchText.trim() ? 'var(--color-primary)' : 'var(--border-subtle)',
                  color: batchText.trim() ? '#FFF' : 'var(--text-dim)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: batchText.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Ingest All Lines as Separate Clips
              </button>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <Check size={16} />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
