import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ClipboardItem, RegisteredDevice } from '@clipvault/shared';
import { vaultStorage } from './services/vaultStorage';
import { syncClipboardElements, handleNativePasteEvent, SyncResult } from './services/clipboardSync';
import { Header } from './components/Header';
import { QuickSaveBar } from './components/QuickSaveBar';
import { FilterBar } from './components/FilterBar';
import { ItemCard } from './components/ItemCard';
import { DeviceModal } from './components/DeviceModal';
import { ExportModal } from './components/ExportModal';
import { ClipboardCheck, Sparkles, DownloadCloud, Check, Zap, ShieldAlert, Lock } from 'lucide-react';
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
  const [pasteToast, setPasteToast] = useState<{ message: string; isAuto?: boolean } | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(() => vaultStorage.isAutoSyncEnabled());
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track auto-sync throttle to avoid spamming
  const lastSyncTimeRef = useRef<number>(0);

  const refreshVault = useCallback(() => {
    setItems(vaultStorage.getItems());
  }, []);

  const handleToggleAutoSync = () => {
    setAutoSync((prev) => {
      const next = !prev;
      vaultStorage.setAutoSyncEnabled(next);
      return next;
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncClipboardElements({ silent: false });
      refreshVault();
      setPasteToast({ message: res.summary, isAuto: false });
      setTimeout(() => setPasteToast(null), 3000);
    } catch {
      setPasteToast({ message: 'Clipboard access requires browser permission', isAuto: false });
      setTimeout(() => setPasteToast(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerAutoSync = useCallback(async () => {
    if (!autoSync) return;
    const now = Date.now();
    // Throttle to at most once every 1200ms
    if (now - lastSyncTimeRef.current < 1200) return;
    lastSyncTimeRef.current = now;

    try {
      const res = await syncClipboardElements({ silent: true });
      if (res.addedCount > 0) {
        refreshVault();
        setPasteToast({ message: `⚡ Auto-Synced: ${res.summary}`, isAuto: true });
        setTimeout(() => setPasteToast(null), 3000);
      }
    } catch {
      // Silent catch on auto-sync
    }
  }, [autoSync, refreshVault]);

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

  // Set up Auto-Sync triggers (Focus, Visibility Change, Page Show, Interval)
  useEffect(() => {
    if (!autoSync) return;

    const onFocus = () => {
      triggerAutoSync();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerAutoSync();
      }
    };

    const onPageShow = () => {
      triggerAutoSync();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    // Background interval check while tab is actively focused
    const intervalId = setInterval(() => {
      if (document.hasFocus()) {
        triggerAutoSync();
      }
    }, 2500);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      clearInterval(intervalId);
    };
  }, [autoSync, triggerAutoSync]);

  // Set up Global Native Paste Listener (Ctrl+V, mobile long-press paste outside inputs)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing inside the manual input
      if (document.activeElement?.id === 'quick-save-input') {
        return;
      }

      handleNativePasteEvent(e, (result: SyncResult) => {
        refreshVault();
        setPasteToast({ message: result.summary, isAuto: false });
        setTimeout(() => setPasteToast(null), 3000);
      });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [refreshVault]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSave = (plainText: string) => {
    const result = vaultStorage.saveItem({ plainText });
    refreshVault();
    return result;
  };

  const handleTogglePin = (id: string) => {
    vaultStorage.togglePin(id);
    refreshVault();
  };

  const handleToggleFavorite = (id: string) => {
    vaultStorage.toggleFavorite(id);
    refreshVault();
  };

  const handleDelete = (id: string) => {
    vaultStorage.deleteItem(id);
    refreshVault();
  };

  const handleRevokeDevice = (deviceId: string) => {
    vaultStorage.revokeDevice(deviceId);
    setDevices(vaultStorage.getDevices());
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

      {/* Insecure HTTP Banner: Explains how to unlock Clipboard API */}
      {typeof window !== 'undefined' && !window.isSecureContext && window.location.protocol === 'http:' && (
        <div style={{
          backgroundColor: 'var(--color-warning-bg)',
          borderBottom: '1px solid var(--color-warning)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)' }}>
            <ShieldAlert size={18} />
            <div>
              <span style={{ fontWeight: 700 }}>Insecure HTTP Detected: </span>
              <span>Mobile browsers disable clipboard access over HTTP. Switch to HTTPS to enable 1-Click Sync.</span>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.protocol = 'https:';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--color-warning)',
              color: '#FFF',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '12px'
            }}
          >
            <Lock size={13} />
            <span>Switch to HTTPS (Unlocks Sync)</span>
          </button>
        </div>
      )}

      <QuickSaveBar
        onSave={handleSave}
        onSyncComplete={(result) => {
          refreshVault();
          setPasteToast({ message: result.summary, isAuto: false });
          setTimeout(() => setPasteToast(null), 3000);
        }}
        autoSync={autoSync}
        onToggleAutoSync={handleToggleAutoSync}
      />

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
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              {searchQuery
                ? 'Try adjusting your search terms or clearing the active filter.'
                : 'Copy any text, link, or screenshot in any app on your phone, then return here. ClipVault auto-syncs it into your permanent vault!'}
            </p>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <Sparkles size={15} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Clipboard Now'}</span>
            </button>
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

      {/* Floating 1-Tap Sync Button (Never focuses input, zero keyboard popup!) */}
      <button
        onClick={handleManualSync}
        disabled={isSyncing}
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
          transition: 'transform 0.15s ease, opacity 0.15s ease',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          opacity: isSyncing ? 0.75 : 1
        }}
        title="Tap to sync all clipboard content (text, links, screenshots) immediately"
      >
        <Sparkles size={18} />
        <span>{isSyncing ? 'Syncing...' : 'Sync Clipboard'}</span>
      </button>

      {/* Feedback Toast */}
      {pasteToast && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: '24px',
          backgroundColor: pasteToast.isAuto ? 'var(--color-success-bg)' : 'var(--bg-surface-elevated)',
          color: pasteToast.isAuto ? 'var(--color-success)' : 'var(--text-main)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          border: `1px solid ${pasteToast.isAuto ? 'rgba(46, 125, 50, 0.3)' : 'var(--border-subtle)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 101,
          animation: 'fadeIn 0.2s ease'
        }}>
          {pasteToast.isAuto ? <Zap size={16} /> : <Check size={16} color="var(--color-primary)" />}
          <span>{pasteToast.message}</span>
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
