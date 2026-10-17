import React, { useState, useEffect } from 'react';
import { ClipboardItem, RegisteredDevice } from '@clipvault/shared';
import { vaultStorage } from './services/vaultStorage';
import { Header } from './components/Header';
import { QuickSaveBar } from './components/QuickSaveBar';
import { FilterBar } from './components/FilterBar';
import { ItemCard } from './components/ItemCard';
import { DeviceModal } from './components/DeviceModal';
import { ExportModal } from './components/ExportModal';
import { ClipboardCheck, ClipboardPaste, DownloadCloud, Check } from 'lucide-react';
import './styles/tokens.css';

export const App: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);

  useEffect(() => {
    // Initial data load
    setItems(vaultStorage.getItems());
    setDevices(vaultStorage.getDevices());

    // Sync theme attribute to document
    document.documentElement.setAttribute('data-theme', theme);

    // Listen for PWA install prompt
    const installHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', installHandler);
    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSave = (plainText: string) => {
    const result = vaultStorage.saveItem({ plainText });
    setItems(vaultStorage.getItems());
    return result;
  };

  const handleTogglePin = (id: string) => {
    vaultStorage.togglePin(id);
    setItems(vaultStorage.getItems());
  };

  const handleToggleFavorite = (id: string) => {
    vaultStorage.toggleFavorite(id);
    setItems(vaultStorage.getItems());
  };

  const handleDelete = (id: string) => {
    vaultStorage.deleteItem(id);
    setItems(vaultStorage.getItems());
  };

  const handleRevokeDevice = (deviceId: string) => {
    vaultStorage.revokeDevice(deviceId);
    setDevices(vaultStorage.getDevices());
  };

  const handleDirectPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const { isDuplicate } = handleSave(text);
          try {
            navigator.vibrate?.(40);
          } catch {
            // vibration not supported
          }
          setPasteToast(isDuplicate ? 'Duplicate refreshed!' : 'Copied from device clipboard & saved!');
          setTimeout(() => setPasteToast(null), 3000);
          return;
        }
      }
      document.getElementById('quick-save-input')?.focus();
    } catch {
      document.getElementById('quick-save-input')?.focus();
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    // Search query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const textMatch = item.plainText.toLowerCase().includes(q);
      const urlMatch = item.detectedUrl?.toLowerCase().includes(q) ?? false;
      const appMatch = item.sourceApp?.toLowerCase().includes(q) ?? false;
      if (!textMatch && !urlMatch && !appMatch) return false;
    }

    // Tab filter match
    switch (selectedFilter) {
      case 'Pinned':
        return item.isPinned;
      case 'Favorites':
        return item.isFavorite;
      case 'URLs':
        return item.contentType === 'url';
      case 'Code':
        return item.contentType === 'code';
      case 'Text':
        return item.contentType === 'text';
      case 'Images':
        return item.contentType === 'image';
      default:
        return true;
    }
  });

  const pinnedCount = items.filter((i) => i.isPinned).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Header
        totalCount={items.length}
        pinnedCount={pinnedCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDevices={() => setIsDeviceModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* PWA Install Banner if browser supports installation */}
      {deferredPrompt && (
        <div style={{
          backgroundColor: 'var(--color-primary-light)',
          borderBottom: '1px solid var(--color-primary-border)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
            <DownloadCloud size={16} />
            <span style={{ fontWeight: 600 }}>Install ClipVault Web App</span>
            <span style={{ color: 'var(--text-muted)' }} className="hide-on-mobile">
              • Access your clipboard anytime from your home screen
            </span>
          </div>
          <button
            onClick={handleInstallClick}
            style={{
              padding: '5px 12px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '12px'
            }}
          >
            Install
          </button>
        </div>
      )}

      <QuickSaveBar onSave={handleSave} />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      <main style={{
        flex: 1,
        maxWidth: '840px',
        width: '100%',
        margin: '0 auto',
        padding: '0 24px 80px 24px'
      }}>
        {filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            marginTop: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-canvas)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--text-dim)'
            }}>
              <ClipboardCheck size={24} />
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
              {searchQuery ? 'No matching clipboard items found' : 'Your vault is empty'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto' }}>
              {searchQuery
                ? 'Try adjusting your search terms or clearing the active filter.'
                : 'Paste a link, code snippet, or note above to start building your permanent clipboard archive.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onTogglePin={handleTogglePin}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating 1-Tap Paste Button (Mobile & Desktop) */}
      <button
        onClick={handleDirectPaste}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 20px',
          backgroundColor: 'var(--color-primary)',
          color: '#FFF',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-lg)',
          fontWeight: 600,
          fontSize: '14px',
          zIndex: 100,
          transition: 'transform 0.15s ease',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
        title="Tap to paste and save clipboard content"
      >
        <ClipboardPaste size={18} />
        <span>Paste & Save</span>
      </button>

      {/* Feedback Toast */}
      {pasteToast && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: '24px',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-main)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 101,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={16} color="var(--color-primary)" />
          <span>{pasteToast}</span>
        </div>
      )}

      <DeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        devices={devices}
        onRevokeDevice={handleRevokeDevice}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
