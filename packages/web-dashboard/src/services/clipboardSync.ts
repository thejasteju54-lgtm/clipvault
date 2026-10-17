import type { CreateClipboardItemInput, ClipboardItem } from '@clipvault/shared';
import { vaultStorage } from './vaultStorage';

export interface SyncResult {
  success: boolean;
  addedCount: number;
  refreshedCount: number;
  items: ClipboardItem[];
  summary: string;
  error?: string;
}

/**
 * Converts a Blob to a base64 Data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Ingests a single item into the vault and updates duplicate tracking.
 */
function ingestInput(input: CreateClipboardItemInput): { item: ClipboardItem; isDuplicate: boolean } {
  const result = vaultStorage.saveItem(input);
  vaultStorage.setLastSyncedHash(result.item.contentHash);
  return result;
}

/**
 * Reads all clipboard elements (screenshots, images, text, links) and saves them to the vault.
 * ZERO keyboard popups: never focuses any input element.
 */
export async function syncClipboardElements(options: { silent?: boolean } = {}): Promise<SyncResult> {
  const itemsIngested: ClipboardItem[] = [];
  let added = 0;
  let refreshed = 0;
  const lastHash = vaultStorage.getLastSyncedHash();

  // Try modern multimodal Clipboard API first (images + text)
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    if (typeof navigator.clipboard.read === 'function') {
      try {
        const clipItems = await navigator.clipboard.read();
        
        for (const clipItem of clipItems) {
          // Check for images (screenshots, photos, graphics)
          const imageType = clipItem.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            try {
              const blob = await clipItem.getType(imageType);
              const dataUrl = await blobToDataUrl(blob);
              const sizeKb = (blob.size / 1024).toFixed(1);
              const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              const input: CreateClipboardItemInput = {
                plainText: `Screenshot (${sizeKb} KB) - ${timeString}`,
                contentType: 'image',
                originalMimeTypes: [imageType],
                attachmentUrl: dataUrl,
                sourceApp: 'Clipboard Image'
              };

              const { item, isDuplicate } = ingestInput(input);
              if (isDuplicate) {
                refreshed++;
              } else {
                added++;
              }
              itemsIngested.push(item);
              continue;
            } catch {
              // Fall through to text checking if image conversion fails
            }
          }

          // Check for text/plain
          if (clipItem.types.includes('text/plain')) {
            try {
              const blob = await clipItem.getType('text/plain');
              const text = await blob.text();
              const trimmed = text.trim();
              if (trimmed) {
                const input: CreateClipboardItemInput = {
                  plainText: trimmed,
                  sourceApp: 'Clipboard Text'
                };
                const { item, isDuplicate } = ingestInput(input);
                if (isDuplicate) {
                  refreshed++;
                } else {
                  added++;
                }
                itemsIngested.push(item);
              }
            } catch {
              // Ignore failure reading this specific type
            }
          }
        }

        if (itemsIngested.length > 0) {
          // Vibrate softly on mobile if available
          try {
            navigator.vibrate?.(35);
          } catch {
            // vibration unsupported
          }

          const firstItem = itemsIngested[0];
          const summary = added > 0
            ? (firstItem.contentType === 'image' ? 'Screenshot saved to vault!' : `Synced: "${firstItem.plainText.slice(0, 32)}..."`)
            : 'Clipboard item refreshed!';

          return {
            success: true,
            addedCount: added,
            refreshedCount: refreshed,
            items: itemsIngested,
            summary
          };
        }
      } catch (err: any) {
        // read() may be restricted on some mobile browsers; fall back to readText()
      }
    }

    // Fallback: Read plain text if read() failed or wasn't supported
    if (typeof navigator.clipboard.readText === 'function') {
      try {
        const text = await navigator.clipboard.readText();
        const trimmed = (text || '').trim();

        if (trimmed) {
          const input: CreateClipboardItemInput = {
            plainText: trimmed,
            sourceApp: 'Mobile Clipboard'
          };

          const { item, isDuplicate } = ingestInput(input);

          // If in silent auto-sync mode and it's already the last synced item, don't re-alert
          if (options.silent && isDuplicate && lastHash === item.contentHash) {
            return {
              success: true,
              addedCount: 0,
              refreshedCount: 0,
              items: [item],
              summary: 'Vault up to date'
            };
          }

          try {
            navigator.vibrate?.(35);
          } catch {
            // vibration unsupported
          }

          const summary = isDuplicate ? 'Clipboard item refreshed!' : `Synced: "${trimmed.slice(0, 32)}..."`;
          return {
            success: true,
            addedCount: isDuplicate ? 0 : 1,
            refreshedCount: isDuplicate ? 1 : 0,
            items: [item],
            summary
          };
        } else {
          return {
            success: false,
            addedCount: 0,
            refreshedCount: 0,
            items: [],
            summary: 'Clipboard is currently empty'
          };
        }
      } catch (err: any) {
        return {
          success: false,
          addedCount: 0,
          refreshedCount: 0,
          items: [],
          summary: 'Tap to grant clipboard access in browser prompt',
          error: err?.message || 'Permission denied'
        };
      }
    }
  }

  return {
    success: false,
    addedCount: 0,
    refreshedCount: 0,
    items: [],
    summary: 'Clipboard API not supported on this browser'
  };
}

/**
 * Handles incoming native paste events (e.g. long press Paste or Ctrl+V anywhere).
 */
export async function handleNativePasteEvent(
  e: ClipboardEvent,
  onSuccess: (result: SyncResult) => void
): Promise<void> {
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  const items = clipboardData.items;
  if (!items || items.length === 0) return;

  const ingested: ClipboardItem[] = [];
  let added = 0;
  let refreshed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        try {
          const dataUrl = await blobToDataUrl(file);
          const sizeKb = (file.size / 1024).toFixed(1);
          const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const input: CreateClipboardItemInput = {
            plainText: `Screenshot (${sizeKb} KB) - ${timeString}`,
            contentType: 'image',
            originalMimeTypes: [file.type],
            attachmentUrl: dataUrl,
            sourceApp: 'Native Paste'
          };

          const res = ingestInput(input);
          if (res.isDuplicate) refreshed++; else added++;
          ingested.push(res.item);
        } catch {
          // Ignore
        }
      }
    } else if (item.type === 'text/plain') {
      const text = clipboardData.getData('text/plain');
      const trimmed = (text || '').trim();
      if (trimmed) {
        const input: CreateClipboardItemInput = {
          plainText: trimmed,
          sourceApp: 'Native Paste'
        };
        const res = ingestInput(input);
        if (res.isDuplicate) refreshed++; else added++;
        ingested.push(res.item);
      }
    }
  }

  if (ingested.length > 0) {
    try {
      navigator.vibrate?.(35);
    } catch {
      // vibration unsupported
    }
    const firstItem = ingested[0];
    onSuccess({
      success: true,
      addedCount: added,
      refreshedCount: refreshed,
      items: ingested,
      summary: firstItem.contentType === 'image' ? 'Screenshot saved to vault!' : `Pasted: "${firstItem.plainText.slice(0, 32)}..."`
    });
  }
}
