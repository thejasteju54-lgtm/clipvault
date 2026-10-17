import { VaultDatabase } from './db/vaultDb.js';
import { WindowsClipboardListener } from './capture/windowsListener.js';
import { SyncEngine } from './sync/syncEngine.js';
import { formatSafeLog, CloudSyncAdapter, SupabaseSyncAdapter } from '@clipvault/shared';

export class DesktopAgent {
  private db: VaultDatabase;
  private listener: WindowsClipboardListener;
  private syncEngine: SyncEngine | null = null;

  constructor(customDbPath?: string, customSyncAdapter?: CloudSyncAdapter) {
    this.db = new VaultDatabase(customDbPath);
    this.listener = new WindowsClipboardListener((input) => {
      this.handleClipboardCapture(input);
    });

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const userId = process.env.CLIPVAULT_USER_ID || '00000000-0000-0000-0000-000000000000';
    const deviceId = process.env.CLIPVAULT_DEVICE_ID || 'win-desktop-default';
    const deviceName = process.env.CLIPVAULT_DEVICE_NAME || 'Windows Workstation';

    let adapter: CloudSyncAdapter | null = customSyncAdapter || null;
    if (!adapter && supabaseUrl && supabaseAnonKey) {
      adapter = new SupabaseSyncAdapter({ supabaseUrl, supabaseAnonKey });
    }

    if (adapter) {
      this.syncEngine = new SyncEngine({
        db: this.db,
        cloudAdapter: adapter,
        userId,
        deviceId,
        deviceName
      });
    }
  }

  public async start(): Promise<void> {
    console.log(formatSafeLog('INFO', 'Starting ClipVault Windows Desktop Agent...'));
    const stats = this.db.getStats();
    console.log(formatSafeLog('INFO', `Vault initialized: ${stats.totalItems} items saved (${stats.pinnedItems} pinned)`));

    this.listener.start();

    if (this.syncEngine) {
      try {
        await this.syncEngine.start();
        console.log(formatSafeLog('INFO', 'Cross-device cloud sync worker active'));
      } catch (err: any) {
        console.warn(formatSafeLog('WARN', 'Cloud sync failed to start; running in durable offline mode', { error: err.message }));
      }
    } else {
      console.log(formatSafeLog('INFO', 'Cloud sync not configured; running in standalone local mode'));
    }

    // Handle clean shutdown
    const shutdown = () => {
      console.log(formatSafeLog('INFO', 'Shutting down Desktop Agent cleanly...'));
      this.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  public stop(): void {
    if (this.syncEngine) {
      this.syncEngine.stop();
    }
    this.listener.stop();
    this.db.close();
  }

  public getDatabase(): VaultDatabase {
    return this.db;
  }

  public getSyncEngine(): SyncEngine | null {
    return this.syncEngine;
  }

  private handleClipboardCapture(input: any): void {
    try {
      const { item, isDuplicate } = this.db.insertOrUpdateItem(input);
      if (isDuplicate) {
        console.log(formatSafeLog('INFO', 'Duplicate clipboard item refreshed', {
          recordId: item.id,
          contentType: item.contentType,
          contentSizeBytes: item.contentSizeBytes
        }));
      } else {
        console.log(formatSafeLog('INFO', 'New clipboard item captured and persisted to local vault', {
          recordId: item.id,
          contentType: item.contentType,
          contentSizeBytes: item.contentSizeBytes
        }));
      }
    } catch (err: any) {
      console.error(formatSafeLog('ERROR', 'Failed to persist clipboard item', { error: err.message }));
    }
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  const agent = new DesktopAgent();
  agent.start();
}
