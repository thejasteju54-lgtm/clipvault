import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ClipboardItem, RegisteredDevice } from '../types/clipboard.js';
import { CloudSyncAdapter, SyncPushResult, DeviceStatusResult } from './cloudAdapter.js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export class SupabaseSyncAdapter implements CloudSyncAdapter {
  private client: SupabaseClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true
      }
    });
  }

  public async upsertClipboardItem(item: ClipboardItem, _idempotencyKey?: string): Promise<SyncPushResult> {
    try {
      const row = {
        id: item.id,
        user_id: item.userId,
        device_id: item.deviceId,
        device_name: item.deviceName,
        device_sequence: item.deviceSequence,
        content_type: item.contentType,
        original_mime_types: item.originalMimeTypes,
        plain_text: item.plainText,
        detected_url: item.detectedUrl,
        html_content: item.htmlContent,
        content_hash: item.contentHash,
        content_size_bytes: item.contentSizeBytes,
        attachment_path: item.attachmentPath,
        attachment_url: item.attachmentUrl,
        source_app: item.sourceApp,
        is_pinned: item.isPinned,
        is_favorite: item.isFavorite,
        tags: item.tags,
        captured_at: item.capturedAt,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        sync_status: 'synced',
        retention_policy: item.retentionPolicy
      };

      const { data, error } = await this.client
        .from('clipboard_items')
        .upsert(row, { onConflict: 'content_hash' })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const returnedItem: ClipboardItem = {
        ...item,
        id: data.id,
        syncStatus: 'synced'
      };

      return { success: true, item: returnedItem };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown network error' };
    }
  }

  public async deleteClipboardItem(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('clipboard_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async fetchClipboardItems(userId: string, since?: string): Promise<{ data: ClipboardItem[]; error?: string }> {
    try {
      let query = this.client
        .from('clipboard_items')
        .select('*')
        .eq('user_id', userId)
        .order('captured_at', { ascending: false });

      if (since) {
        query = query.gt('updated_at', since);
      }

      const { data, error } = await query;
      if (error) return { data: [], error: error.message };

      const items: ClipboardItem[] = (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        deviceId: r.device_id,
        deviceName: r.device_name,
        deviceSequence: r.device_sequence,
        contentType: r.content_type,
        originalMimeTypes: r.original_mime_types || [],
        plainText: r.plain_text,
        detectedUrl: r.detected_url,
        htmlContent: r.html_content,
        contentHash: r.content_hash,
        contentSizeBytes: r.content_size_bytes,
        attachmentPath: r.attachment_path,
        attachmentUrl: r.attachment_url,
        sourceApp: r.source_app,
        isPinned: r.is_pinned,
        isFavorite: r.is_favorite,
        tags: r.tags || [],
        capturedAt: r.captured_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        syncStatus: 'synced',
        retentionPolicy: r.retention_policy
      }));

      return { data: items };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  }

  public async registerDevice(device: RegisteredDevice): Promise<{ success: boolean; error?: string }> {
    try {
      const row = {
        id: device.id,
        user_id: device.userId,
        device_id: device.deviceId,
        device_name: device.deviceName,
        platform: device.platform,
        os_version: device.osVersion,
        app_version: device.appVersion,
        last_seen_at: device.lastSeenAt,
        is_revoked: device.isRevoked,
        registered_at: device.registeredAt
      };

      const { error } = await this.client
        .from('devices')
        .upsert(row, { onConflict: 'device_id' });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async checkDeviceStatus(deviceId: string, userId: string): Promise<DeviceStatusResult> {
    try {
      const { data, error } = await this.client
        .from('devices')
        .select('is_revoked')
        .eq('device_id', deviceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return { success: false, isRevoked: false, error: error.message };
      if (!data) return { success: false, isRevoked: false, error: 'Device not registered' };

      return { success: true, isRevoked: data.is_revoked };
    } catch (err: any) {
      return { success: false, isRevoked: false, error: err.message };
    }
  }

  public async revokeDevice(deviceId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client
        .from('devices')
        .update({ is_revoked: true, last_seen_at: new Date().toISOString() })
        .eq('device_id', deviceId)
        .eq('user_id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async listDevices(userId: string): Promise<{ data: RegisteredDevice[]; error?: string }> {
    try {
      const { data, error } = await this.client
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('registered_at', { ascending: true });

      if (error) return { data: [], error: error.message };

      const devices: RegisteredDevice[] = (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        deviceId: r.device_id,
        deviceName: r.device_name,
        platform: r.platform,
        osVersion: r.os_version,
        appVersion: r.app_version,
        lastSeenAt: r.last_seen_at,
        isRevoked: r.is_revoked,
        registeredAt: r.registered_at
      }));

      return { data: devices };
    } catch (err: any) {
      return { data: [], error: err.message };
    }
  }

  public subscribeToChanges(
    userId: string,
    onInsert: (item: ClipboardItem) => void,
    onUpdate: (item: ClipboardItem) => void,
    onDelete: (id: string) => void
  ): () => void {
    const channel = this.client
      .channel(`sync_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clipboard_items',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const r = payload.new;
            onInsert({
              id: r.id,
              userId: r.user_id,
              deviceId: r.device_id,
              deviceName: r.device_name,
              deviceSequence: r.device_sequence,
              contentType: r.content_type,
              originalMimeTypes: r.original_mime_types || [],
              plainText: r.plain_text,
              detectedUrl: r.detected_url,
              htmlContent: r.html_content,
              contentHash: r.content_hash,
              contentSizeBytes: r.content_size_bytes,
              attachmentPath: r.attachment_path,
              attachmentUrl: r.attachment_url,
              sourceApp: r.source_app,
              isPinned: r.is_pinned,
              isFavorite: r.is_favorite,
              tags: r.tags || [],
              capturedAt: r.captured_at,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
              syncStatus: 'synced',
              retentionPolicy: r.retention_policy
            });
          } else if (payload.eventType === 'UPDATE') {
            const r = payload.new;
            onUpdate({
              id: r.id,
              userId: r.user_id,
              deviceId: r.device_id,
              deviceName: r.device_name,
              deviceSequence: r.device_sequence,
              contentType: r.content_type,
              originalMimeTypes: r.original_mime_types || [],
              plainText: r.plain_text,
              detectedUrl: r.detected_url,
              htmlContent: r.html_content,
              contentHash: r.content_hash,
              contentSizeBytes: r.content_size_bytes,
              attachmentPath: r.attachment_path,
              attachmentUrl: r.attachment_url,
              sourceApp: r.source_app,
              isPinned: r.is_pinned,
              isFavorite: r.is_favorite,
              tags: r.tags || [],
              capturedAt: r.captured_at,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
              syncStatus: 'synced',
              retentionPolicy: r.retention_policy
            });
          } else if (payload.eventType === 'DELETE') {
            onDelete(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

/**
 * In-memory cloud sync adapter for self-contained automated testing.
 * Simulates Supabase table storage, RLS enforcement, device revocation, and Realtime broadcasts.
 */
export class InMemorySyncAdapter implements CloudSyncAdapter {
  private items: Map<string, ClipboardItem> = new Map();
  private devices: Map<string, RegisteredDevice> = new Map();
  private subscribers: Array<{
    userId: string;
    onInsert: (item: ClipboardItem) => void;
    onUpdate: (item: ClipboardItem) => void;
    onDelete: (id: string) => void;
  }> = [];

  public isOnline: boolean = true;

  public async upsertClipboardItem(item: ClipboardItem, _idempotencyKey?: string): Promise<SyncPushResult> {
    if (!this.isOnline) {
      return { success: false, error: 'Network unavailable (offline)' };
    }

    // Check device revocation
    const dev = this.devices.get(item.deviceId);
    if (dev && dev.isRevoked) {
      return { success: false, error: 'Device revoked. Unauthorized.' };
    }

    // Check existing by content hash (deduplication)
    for (const [_, existing] of this.items.entries()) {
      if (existing.userId === item.userId && existing.contentHash === item.contentHash) {
        // Touch timestamps, preserve pin/tags
        const merged: ClipboardItem = {
          ...existing,
          capturedAt: item.capturedAt,
          updatedAt: new Date().toISOString(),
          isPinned: existing.isPinned || item.isPinned,
          tags: Array.from(new Set([...existing.tags, ...item.tags])),
          syncStatus: 'synced'
        };
        this.items.set(existing.id, merged);
        this.notifySubscribers('UPDATE', merged);
        return { success: true, item: merged, isDuplicate: true };
      }
    }

    const newItem: ClipboardItem = {
      ...item,
      syncStatus: 'synced'
    };

    this.items.set(newItem.id, newItem);
    this.notifySubscribers('INSERT', newItem);

    return { success: true, item: newItem };
  }

  public async deleteClipboardItem(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnline) return { success: false, error: 'Offline' };
    const item = this.items.get(id);
    if (!item) return { success: false, error: 'Item not found' };
    if (item.userId !== userId) return { success: false, error: 'Unauthorized IDOR violation' };

    this.items.delete(id);
    this.notifySubscribers('DELETE', item);
    return { success: true };
  }

  public async fetchClipboardItems(userId: string, since?: string): Promise<{ data: ClipboardItem[]; error?: string }> {
    if (!this.isOnline) return { data: [], error: 'Offline' };
    let list = Array.from(this.items.values()).filter((i) => i.userId === userId);

    if (since) {
      list = list.filter((i) => i.updatedAt > since);
    }

    list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    return { data: list };
  }

  public async registerDevice(device: RegisteredDevice): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnline) return { success: false, error: 'Offline' };
    this.devices.set(device.deviceId, { ...device });
    return { success: true };
  }

  public async checkDeviceStatus(deviceId: string, userId: string): Promise<DeviceStatusResult> {
    if (!this.isOnline) return { success: false, isRevoked: false, error: 'Offline' };
    const dev = this.devices.get(deviceId);
    if (!dev || dev.userId !== userId) {
      return { success: false, isRevoked: false, error: 'Device not registered' };
    }
    return { success: true, isRevoked: dev.isRevoked };
  }

  public async revokeDevice(deviceId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnline) return { success: false, error: 'Offline' };
    const dev = this.devices.get(deviceId);
    if (!dev || dev.userId !== userId) {
      return { success: false, error: 'Device not found' };
    }
    dev.isRevoked = true;
    dev.lastSeenAt = new Date().toISOString();
    this.devices.set(deviceId, dev);
    return { success: true };
  }

  public async listDevices(userId: string): Promise<{ data: RegisteredDevice[]; error?: string }> {
    if (!this.isOnline) return { data: [], error: 'Offline' };
    const list = Array.from(this.devices.values()).filter((d) => d.userId === userId);
    return { data: list };
  }

  public subscribeToChanges(
    userId: string,
    onInsert: (item: ClipboardItem) => void,
    onUpdate: (item: ClipboardItem) => void,
    onDelete: (id: string) => void
  ): () => void {
    const sub = { userId, onInsert, onUpdate, onDelete };
    this.subscribers.push(sub);
    return () => {
      const idx = this.subscribers.indexOf(sub);
      if (idx !== -1) this.subscribers.splice(idx, 1);
    };
  }

  private notifySubscribers(type: 'INSERT' | 'UPDATE' | 'DELETE', item: ClipboardItem): void {
    for (const sub of this.subscribers) {
      if (sub.userId === item.userId) {
        if (type === 'INSERT') sub.onInsert(item);
        if (type === 'UPDATE') sub.onUpdate(item);
        if (type === 'DELETE') sub.onDelete(item.id);
      }
    }
  }
}
