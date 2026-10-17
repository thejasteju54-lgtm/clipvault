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
import { BatchIngestModal } from './components/BatchIngestModal';
import { SegmentedVault } from './components/SegmentedVault';
import { ClipboardCheck, Sparkles, DownloadCloud, Check, Zap, ShieldAlert, Lock, LayoutGrid, List } from 'lucide-react';
import './styles/tokens.css';

export const App: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'segmented' | 'feed'>('segmented');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
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

    // On mobile, the first touch or tap on the page provides approved user-gesture context
    const onPointerDown = () => {
      triggerAutoSync();
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

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
      window.removeEventListener('pointerdown', onPointerDown);
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

  const handleToggleOpened = (id: string) => {
    vaultStorage.toggleOpened(id);
    refreshVault();
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
        return item.contentType === 'url' || Boolean(item.detectedUrl);
      case 'Code':
        return item.contentType === 'code';
      case 'Text':
        return item.contentType === 'text' || item.contentType === 'rich_text';
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
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      {/* View Mode Switcher */}
      <div style={{
        maxWidth: '840px',
        width: '100%',
        margin: '0 auto',
        padding: '0 16px 10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => setViewMode('segmented')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: viewMode === 'segmented' ? 600 : 500,
              backgroundColor: viewMode === 'segmented' ? 'var(--color-primary-light)' : 'transparent',
              color: viewMode === 'segmented' ? 'var(--color-primary)' : 'var(--text-muted)',
              border: viewMode === 'segmented' ? '1px solid var(--color-primary-border)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutGrid size={13} />
            <span>Segments</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('feed')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: viewMode === 'feed' ? 600 : 500,
              backgroundColor: viewMode === 'feed' ? 'var(--color-primary-light)' : 'transparent',
              color: viewMode === 'feed' ? 'var(--color-primary)' : 'var(--text-muted)',
              border: viewMode === 'feed' ? '1px solid var(--color-primary-border)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <List size={13} />
            <span>All Feed</span>
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>
          {filteredItems.length} {filteredItems.length === 1 ? 'clip' : 'clips'}
        </div>
      </div>

      <main style={{
        flex: 1,
        maxWidth: '840px',
        width: '100%',
        margin: '0 auto',
        padding: '0 16px 110px 16px'
      }}>
        {filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            marginTop: '8px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-canvas)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              color: 'var(--text-dim)'
            }}>
              <ClipboardCheck size={20} />
            </div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
              {searchQuery ? 'No matching clips found' : 'Your vault is empty'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
              {searchQuery
                ? 'Try adjusting your search query or switching to another filter.'
                : 'Copy any link or note on your phone, then return here. ClipVault auto-sorts it into clean segments!'}
            </p>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Clipboard'}</span>
            </button>
          </div>
        ) : viewMode === 'segmented' && selectedFilter === 'All' && !searchQuery ? (
          <SegmentedVault
            items={filteredItems}
            onTogglePin={handleTogglePin}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDelete}
            onToggleOpened={handleToggleOpened}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onTogglePin={handleTogglePin}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onToggleOpened={handleToggleOpened}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sleek Floating Sync Button (Mobile thumb-friendly) */}
      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 18px',
          backgroundColor: 'var(--color-primary)',
          color: '#FFF',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
          fontWeight: 600,
          fontSize: '13px',
          zIndex: 100,
          transition: 'all 0.15s ease',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          opacity: isSyncing ? 0.75 : 1,
          cursor: 'pointer'
        }}
        title="Tap to sync clipboard immediately"
      >
        <Sparkles size={15} />
        <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
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

      <BatchIngestModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSyncComplete={(result) => {
          refreshVault();
          setPasteToast({ message: result.summary, isAuto: false });
          setTimeout(() => setPasteToast(null), 3000);
        }}
      />
    </div>
  );
};
