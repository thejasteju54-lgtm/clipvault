import React, { useState, useEffect } from 'react';
import { ClipboardItem, RegisteredDevice } from '@clipvault/shared';
import { vaultStorage } from './services/vaultStorage';
import { Header } from './components/Header';
import { QuickSaveBar } from './components/QuickSaveBar';
import { FilterBar } from './components/FilterBar';
import { ItemCard } from './components/ItemCard';
import { DeviceModal } from './components/DeviceModal';
import { ExportModal } from './components/ExportModal';
import { ClipboardCheck } from 'lucide-react';
import './styles/tokens.css';

export const App: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    // Initial data load
    setItems(vaultStorage.getItems());
    setDevices(vaultStorage.getDevices());

    // Sync theme attribute to document
    document.documentElement.setAttribute('data-theme', theme);
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        totalCount={items.length}
        pinnedCount={pinnedCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDevices={() => setIsDeviceModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

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
        padding: '0 24px 48px 24px'
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
