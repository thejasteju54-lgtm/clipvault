import type { ClipboardItem, CreateClipboardItemInput, RegisteredDevice } from '@clipvault/shared';
import { computeContentHash, extractAndSanitizeUrl, detectCodeSnippet } from '@clipvault/shared';

const STORAGE_KEY_ITEMS = 'clipvault_local_items';
const STORAGE_KEY_DEVICES = 'clipvault_registered_devices';

const DEFAULT_DEVICES: RegisteredDevice[] = [
  {
    id: '11111111-aaaa-bbbb-cccc-000000000001',
    userId: '00000000-0000-0000-0000-000000000000',
    deviceId: 'samsung-a17-oneui8',
    deviceName: 'Samsung Galaxy A17 5G',
    platform: 'android',
    osVersion: 'Android 16 / One UI 8',
    appVersion: '1.0.0',
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 mins ago
    isRevoked: false,
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  },
  {
    id: '11111111-aaaa-bbbb-cccc-000000000002',
    userId: '00000000-0000-0000-0000-000000000000',
    deviceId: 'win-workstation-pc',
    deviceName: 'Primary Workstation',
    platform: 'windows',
    osVersion: 'Windows 11 Pro 24H2',
    appVersion: '1.0.0',
    lastSeenAt: new Date().toISOString(),
    isRevoked: false,
    registeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
  },
  {
    id: '11111111-aaaa-bbbb-cccc-000000000003',
    userId: '00000000-0000-0000-0000-000000000000',
    deviceId: 'web-browser-session',
    deviceName: 'Web Dashboard (Brave)',
    platform: 'web',
    osVersion: 'Chrome / Web Engine',
    appVersion: '1.0.0',
    lastSeenAt: new Date().toISOString(),
    isRevoked: false,
    registeredAt: new Date().toISOString()
  }
];

export const vaultStorage = {
  getItems(): ClipboardItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveItem(input: CreateClipboardItemInput): { item: ClipboardItem; isDuplicate: boolean } {
    const items = this.getItems();
    const now = new Date().toISOString();

    const detectedUrl = input.detectedUrl || (input.plainText ? extractAndSanitizeUrl(input.plainText) : null);
    let contentType = input.contentType || 'text';
    if (contentType === 'text' && input.plainText) {
      let isPureUrl = false;
      try {
        const u = new URL(input.plainText.trim());
        isPureUrl = u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        isPureUrl = false;
      }
      if (isPureUrl) {
        contentType = 'url';
      } else if (detectCodeSnippet(input.plainText)) {
        contentType = 'code';
      }
    }

    // Include attachment url length and slice in content hash if image
    const rawContentForHash = input.attachmentUrl
      ? `${contentType}:${input.plainText || 'screenshot'}:${input.attachmentUrl.length}:${input.attachmentUrl.slice(0, 200)}`
      : (input.plainText || '');

    const contentHash = computeContentHash(rawContentForHash, contentType);

    // Deduplication check
    const existingIndex = items.findIndex((i) => i.contentHash === contentHash);
    if (existingIndex !== -1) {
      const existing = items[existingIndex];
      const updated: ClipboardItem = {
        ...existing,
        capturedAt: now,
        updatedAt: now
      };
      items.splice(existingIndex, 1);
      items.unshift(updated);
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
      return { item: updated, isDuplicate: true };
    }

    const calculatedSize = input.attachmentUrl
      ? Math.round(input.attachmentUrl.length * 0.75)
      : new Blob([input.plainText || '']).size;

    const newItem: ClipboardItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'item-' + Date.now(),
      userId: '00000000-0000-0000-0000-000000000000',
      deviceId: input.deviceId || 'web-browser-session',
      deviceName: input.deviceName || 'Web Dashboard',
      deviceSequence: items.length + 1,
      contentType,
      originalMimeTypes: input.originalMimeTypes || (contentType === 'image' ? ['image/png'] : ['text/plain']),
      plainText: input.plainText || (contentType === 'image' ? 'Screenshot Image' : ''),
      detectedUrl,
      htmlContent: input.htmlContent || null,
      contentHash,
      contentSizeBytes: calculatedSize,
      attachmentPath: null,
      attachmentUrl: input.attachmentUrl || null,
      sourceApp: input.sourceApp || 'WebBrowser',
      isPinned: !!input.isPinned,
      isFavorite: !!input.isFavorite,
      tags: input.tags || [],
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
      retentionPolicy: 'permanent'
    };

    items.unshift(newItem);
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    return { item: newItem, isDuplicate: false };
  },

  isAutoSyncEnabled(): boolean {
    const val = localStorage.getItem('clipvault_auto_sync_enabled');
    return val === null ? true : val === 'true'; // Default ON for seamless mobile sync
  },

  setAutoSyncEnabled(enabled: boolean): void {
    localStorage.setItem('clipvault_auto_sync_enabled', enabled ? 'true' : 'false');
  },

  getLastSyncedHash(): string | null {
    return localStorage.getItem('clipvault_last_synced_hash');
  },

  setLastSyncedHash(hash: string): void {
    localStorage.setItem('clipvault_last_synced_hash', hash);
  },

  togglePin(id: string): boolean {
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return false;
    item.isPinned = !item.isPinned;
    item.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    return item.isPinned;
  },

  toggleFavorite(id: string): boolean {
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return false;
    item.isFavorite = !item.isFavorite;
    item.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    return item.isFavorite;
  },

  deleteItem(id: string): void {
    const items = this.getItems().filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  },

  getDevices(): RegisteredDevice[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DEVICES);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(DEFAULT_DEVICES));
        return DEFAULT_DEVICES;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_DEVICES;
    }
  },

  revokeDevice(deviceId: string): void {
    const devices = this.getDevices().map((d) => {
      if (d.deviceId === deviceId) {
        return { ...d, isRevoked: true };
      }
      return d;
    });
    localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(devices));
  },

  exportData(format: 'json' | 'csv' | 'markdown'): string {
    const items = this.getItems();
    if (format === 'json') {
      return JSON.stringify(items, null, 2);
    }

    if (format === 'csv') {
      const headers = ['ID', 'Type', 'CapturedAt', 'Device', 'IsPinned', 'Content'];
      const rows = items.map((i) => [
        `"${i.id}"`,
        `"${i.contentType}"`,
        `"${i.capturedAt}"`,
        `"${i.deviceName}"`,
        `"${i.isPinned}"`,
        `"${i.plainText.replace(/"/g, '""')}"`
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // Markdown
    return [
      '# ClipVault History Export',
      `*Exported on ${new Date().toISOString()}*`,
      '',
      ...items.map((i) => [
        `### [${i.contentType.toUpperCase()}] ${i.deviceName} — ${i.capturedAt}`,
        i.detectedUrl ? `URL: ${i.detectedUrl}` : '',
        '```',
        i.plainText,
        '```',
        '---'
      ].filter(Boolean).join('\n'))
    ].join('\n\n');
  }
};
