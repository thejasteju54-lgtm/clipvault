import { 
  ClipboardItem, 
  RegisteredDevice, 
  CloudSyncAdapter, 
  computeIdempotencyKey,
  formatSafeLog 
} from '@clipvault/shared';
import { VaultDatabase } from '../db/vaultDb.js';

export interface SyncEngineOptions {
  db: VaultDatabase;
  cloudAdapter: CloudSyncAdapter;
  userId: string;
  deviceId: string;
  deviceName: string;
  syncIntervalMs?: number;
}

export class SyncEngine {
  private db: VaultDatabase;
  private cloudAdapter: CloudSyncAdapter;
  private userId: string;
  private deviceId: string;
  private deviceName: string;
  private syncIntervalMs: number;
  private syncTimer: NodeJS.Timeout | null = null;
  private unsubscribeRealtime: (() => void) | null = null;
  private isSyncing: boolean = false;
  private isRevoked: boolean = false;

  constructor(options: SyncEngineOptions) {
    this.db = options.db;
    this.cloudAdapter = options.cloudAdapter;
    this.userId = options.userId;
    this.deviceId = options.deviceId;
    this.deviceName = options.deviceName;
    this.syncIntervalMs = options.syncIntervalMs || 10000;
  }

  public async start(): Promise<void> {
    const now = new Date().toISOString();
    const device: RegisteredDevice = {
      id: this.deviceId,
      userId: this.userId,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      platform: 'windows',
      osVersion: 'Windows 11',
      appVersion: '1.0.0',
      lastSeenAt: now,
      isRevoked: false,
      registeredAt: now
    };

    // Register / Heartbeat device
    await this.cloudAdapter.registerDevice(device);

    // Verify device status
    const status = await this.cloudAdapter.checkDeviceStatus(this.deviceId, this.userId);
    if (status.isRevoked) {
      this.isRevoked = true;
      throw new Error(`Device ${this.deviceId} is revoked. Access denied.`);
    }

    // Subscribe to realtime peer updates
    if (this.cloudAdapter.subscribeToChanges) {
      this.unsubscribeRealtime = this.cloudAdapter.subscribeToChanges(
        this.userId,
        (remoteItem) => this.handleRemoteChange(remoteItem),
        (remoteItem) => this.handleRemoteChange(remoteItem),
        (deletedId) => this.handleRemoteDelete(deletedId)
      );
    }

    // Trigger initial drain
    await this.syncPendingOutbox();

    // Start background sync timer
    this.syncTimer = setInterval(() => {
      this.syncPendingOutbox().catch((err) => {
        console.error(formatSafeLog('ERROR', 'Background sync iteration failed', { error: err.message }));
      });
    }, this.syncIntervalMs);

    console.log(formatSafeLog('INFO', 'Sync engine started successfully', {
      deviceId: this.deviceId,
      userId: this.userId
    }));
  }

  public stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
      this.unsubscribeRealtime = null;
    }
    console.log(formatSafeLog('INFO', 'Sync engine stopped cleanly'));
  }

  /**
   * Drains pending outbox events from local SQLite to cloud backend with idempotency keys.
   */
  public async syncPendingOutbox(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    if (this.isRevoked) {
      throw new Error(`Device ${this.deviceId} is revoked`);
    }

    this.isSyncing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // Re-verify revocation status
      const status = await this.cloudAdapter.checkDeviceStatus(this.deviceId, this.userId);
      if (status.isRevoked) {
        this.isRevoked = true;
        this.stop();
        throw new Error(`Device ${this.deviceId} has been revoked by account owner`);
      }

      const pendingEvents = this.db.getPendingOutbox(50);
      processed = pendingEvents.length;

      for (const event of pendingEvents) {
        try {
          if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
            const item: ClipboardItem = JSON.parse(event.payloadJson);
            const idempotencyKey = computeIdempotencyKey(item.id, event.eventType, event.attempts);

            const result = await this.cloudAdapter.upsertClipboardItem(item, idempotencyKey);
            if (result.success) {
              this.db.markOutboxCompleted(event.id);
              this.db.updateItemSyncStatus(item.id, 'synced');
              succeeded++;
            } else {
              this.db.markOutboxFailed(event.id, result.error || 'Upload failed');
              failed++;
            }
          } else if (event.eventType === 'DELETE') {
            const result = await this.cloudAdapter.deleteClipboardItem(event.itemId, this.userId);
            if (result.success) {
              this.db.markOutboxCompleted(event.id);
              succeeded++;
            } else {
              this.db.markOutboxFailed(event.id, result.error || 'Remote delete failed');
              failed++;
            }
          }
        } catch (itemErr: any) {
          this.db.markOutboxFailed(event.id, itemErr.message || 'Exception during item sync');
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Handles incoming Realtime changes from remote peer devices (e.g. Android phone or Web).
   */
  private handleRemoteChange(remoteItem: ClipboardItem): void {
    // Echo Prevention: Do not process our own broadcasted events
    if (remoteItem.deviceId === this.deviceId) {
      return;
    }

    try {
      const { item, isUpdated } = this.db.upsertRemoteItem(remoteItem);
      console.log(formatSafeLog('INFO', isUpdated ? 'Merged remote clipboard update' : 'Synchronized new item from peer device', {
        recordId: item.id,
        sourceDevice: remoteItem.deviceName,
        contentType: item.contentType
      }));
    } catch (err: any) {
      console.error(formatSafeLog('ERROR', 'Failed to merge incoming remote item', { error: err.message }));
    }
  }

  private handleRemoteDelete(deletedId: string): void {
    try {
      this.db.deleteItem(deletedId);
      console.log(formatSafeLog('INFO', 'Deleted local item per remote peer request', { recordId: deletedId }));
    } catch (err: any) {
      console.error(formatSafeLog('ERROR', 'Failed to delete local item per remote instruction', { error: err.message }));
    }
  }

  public getRevokedStatus(): boolean {
    return this.isRevoked;
  }
}
