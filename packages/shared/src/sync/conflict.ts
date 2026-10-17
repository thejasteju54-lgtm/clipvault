import { ClipboardItem } from '../types/clipboard.js';

/**
 * Resolves conflict between a local clipboard item and an incoming remote item.
 * 
 * Rules:
 * 1. Deduplication: Content is verified by contentHash.
 * 2. True capture moment: Earliest capturedAt is preserved.
 * 3. Latest-Write-Wins (LWW): Latest updatedAt determines base record state.
 * 4. User Intent Preservation: isPinned and isFavorite are sticky (OR logic).
 * 5. Tags: Union of distinct tags across both devices.
 * 6. Attachments: Preserves local attachmentPath if present, incorporates remote attachmentUrl if available.
 */
export function mergeClipboardItems(local: ClipboardItem, remote: ClipboardItem): ClipboardItem {
  if (local.contentHash !== remote.contentHash && local.id !== remote.id) {
    throw new Error('Cannot merge items with different IDs and different content hashes');
  }

  const earliestCapturedAt = new Date(local.capturedAt) <= new Date(remote.capturedAt) 
    ? local.capturedAt 
    : remote.capturedAt;

  const isLocalNewer = new Date(local.updatedAt) >= new Date(remote.updatedAt);
  const latestUpdatedAt = isLocalNewer ? local.updatedAt : remote.updatedAt;

  // Sticky user preferences: If either device pinned or favorited, keep it
  const isPinned = local.isPinned || remote.isPinned;
  const isFavorite = local.isFavorite || remote.isFavorite;

  // Union tags
  const combinedTags = Array.from(new Set([...(local.tags || []), ...(remote.tags || [])]));

  return {
    ...(isLocalNewer ? local : remote),
    id: local.id, // Retain primary local ID
    capturedAt: earliestCapturedAt,
    updatedAt: latestUpdatedAt,
    isPinned,
    isFavorite,
    tags: combinedTags,
    attachmentPath: local.attachmentPath || remote.attachmentPath || null,
    attachmentUrl: remote.attachmentUrl || local.attachmentUrl || null,
    syncStatus: 'synced'
  };
}
