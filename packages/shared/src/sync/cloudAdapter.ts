import { ClipboardItem, RegisteredDevice } from '../types/clipboard.js';

export interface SyncPushResult {
  success: boolean;
  item?: ClipboardItem;
  error?: string;
  isDuplicate?: boolean;
}

export interface DeviceStatusResult {
  success: boolean;
  isRevoked: boolean;
  error?: string;
}

export interface CloudSyncAdapter {
  upsertClipboardItem(item: ClipboardItem, idempotencyKey?: string): Promise<SyncPushResult>;
  deleteClipboardItem(id: string, userId: string): Promise<{ success: boolean; error?: string }>;
  fetchClipboardItems(userId: string, since?: string): Promise<{ data: ClipboardItem[]; error?: string }>;
  registerDevice(device: RegisteredDevice): Promise<{ success: boolean; error?: string }>;
  checkDeviceStatus(deviceId: string, userId: string): Promise<DeviceStatusResult>;
  revokeDevice(deviceId: string, userId: string): Promise<{ success: boolean; error?: string }>;
  listDevices(userId: string): Promise<{ data: RegisteredDevice[]; error?: string }>;
  subscribeToChanges?(
    userId: string, 
    onInsert: (item: ClipboardItem) => void,
    onUpdate: (item: ClipboardItem) => void,
    onDelete: (id: string) => void
  ): () => void; // Unsubscribe callback
}
