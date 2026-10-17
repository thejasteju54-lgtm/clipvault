/**
 * Domain types and contracts for ClipVault.
 * Standardized across Android, Desktop, Web, and Backend services.
 */

export type ClipboardContentType = 
  | 'text'
  | 'url'
  | 'code'
  | 'rich_text'
  | 'image'
  | 'file_ref';

export type SyncState = 
  | 'local'
  | 'pending_sync'
  | 'synced'
  | 'failed';

export type RetentionPolicy = 
  | 'permanent'
  | '30_days'
  | 'session_only';

export interface ClipboardItem {
  id: string; // UUID v4
  userId: string; // Supabase Auth User ID
  deviceId: string; // Unique Device ID
  deviceName: string; // Friendly device name
  deviceSequence: number; // Monotonically increasing local sequence
  contentType: ClipboardContentType;
  originalMimeTypes: string[];
  plainText: string;
  detectedUrl?: string | null;
  htmlContent?: string | null;
  contentHash: string; // SHA-256 hash of normalized content
  contentSizeBytes: number;
  attachmentPath?: string | null; // Local disk path if applicable
  attachmentUrl?: string | null; // Cloud signed URL if applicable
  sourceApp?: string | null; // App package or binary name (privacy-filtered)
  isPinned: boolean;
  isFavorite: boolean;
  isOpened?: boolean; // For links: tracks whether link was opened
  tags: string[];
  capturedAt: string; // ISO 8601 UTC timestamp
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
  syncStatus: SyncState;
  retentionPolicy: RetentionPolicy;
  isSensitive?: boolean;
}

export interface CreateClipboardItemInput {
  plainText: string;
  contentType?: ClipboardContentType;
  originalMimeTypes?: string[];
  htmlContent?: string | null;
  detectedUrl?: string | null;
  attachmentPath?: string | null;
  attachmentUrl?: string | null;
  sourceApp?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  isOpened?: boolean;
  tags?: string[];
  deviceId?: string;
  deviceName?: string;
}

export interface RegisteredDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: 'android' | 'windows' | 'web' | 'macos' | 'linux';
  osVersion: string;
  appVersion: string;
  lastSeenAt: string;
  isRevoked: boolean;
  registeredAt: string;
}

export interface SyncOutboxEvent {
  id: string; // UUID
  itemId: string;
  userId: string;
  deviceId: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  payloadJson: string;
  attempts: number;
  lastAttemptAt?: string | null;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
  errorMessage?: string | null;
  createdAt: string;
}

export interface ClipboardFilterOptions {
  query?: string;
  contentType?: ClipboardContentType;
  isPinned?: boolean;
  isFavorite?: boolean;
  tag?: string;
  deviceId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}
