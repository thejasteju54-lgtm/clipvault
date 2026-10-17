import { VaultDatabase } from './db/vaultDb.js';
import { WindowsClipboardListener } from './capture/windowsListener.js';
import { formatSafeLog } from '@clipvault/shared';

export class DesktopAgent {
  private db: VaultDatabase;
  private listener: WindowsClipboardListener;

  constructor(customDbPath?: string) {
    this.db = new VaultDatabase(customDbPath);
    this.listener = new WindowsClipboardListener((input) => {
      this.handleClipboardCapture(input);
    });
  }

  public start(): void {
    console.log(formatSafeLog('INFO', 'Starting ClipVault Windows Desktop Agent...'));
    const stats = this.db.getStats();
    console.log(formatSafeLog('INFO', `Vault initialized: ${stats.totalItems} items saved (${stats.pinnedItems} pinned)`));

    this.listener.start();

    // Handle clean shutdown
    const shutdown = () => {
      console.log(formatSafeLog('INFO', 'Shutting down Desktop Agent cleanly...'));
      this.listener.stop();
      this.db.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  public stop(): void {
    this.listener.stop();
    this.db.close();
  }

  public getDatabase(): VaultDatabase {
    return this.db;
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
