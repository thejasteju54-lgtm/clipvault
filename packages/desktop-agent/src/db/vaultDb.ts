import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { 
  ClipboardItem, 
  CreateClipboardItemInput, 
  ClipboardFilterOptions, 
  SyncOutboxEvent,
  SyncState,
  computeContentHash,
  extractAndSanitizeUrl,
  detectCodeSnippet,
  formatSafeLog,
  mergeClipboardItems
} from '@clipvault/shared';

export class VaultDatabase {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const appDataDir = process.env.LOCALAPPDATA || process.env.APPDATA || './data';
      const vaultDir = path.join(appDataDir, 'ClipVault');
      if (!fs.existsSync(vaultDir)) {
        fs.mkdirSync(vaultDir, { recursive: true });
      }
      this.dbPath = path.join(vaultDir, 'vault.sqlite');
    }

    // Ensure parent directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initPragmas();
    this.runMigrations();
  }

  private initPragmas(): void {
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clipboard_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_sequence INTEGER NOT NULL,
        content_type TEXT NOT NULL,
        original_mime_types TEXT NOT NULL,
        plain_text TEXT NOT NULL,
        detected_url TEXT,
        html_content TEXT,
        content_hash TEXT NOT NULL UNIQUE,
        content_size_bytes INTEGER NOT NULL,
        attachment_path TEXT,
        attachment_url TEXT,
        source_app TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        tags TEXT NOT NULL DEFAULT '[]',
        captured_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'local',
        retention_policy TEXT NOT NULL DEFAULT 'permanent'
      );

      CREATE INDEX IF NOT EXISTS idx_items_timeline ON clipboard_items(captured_at DESC);
      CREATE INDEX IF NOT EXISTS idx_items_pinned ON clipboard_items(is_pinned) WHERE is_pinned = 1;
      CREATE INDEX IF NOT EXISTS idx_items_favorite ON clipboard_items(is_favorite) WHERE is_favorite = 1;
      CREATE INDEX IF NOT EXISTS idx_items_type ON clipboard_items(content_type);
      CREATE INDEX IF NOT EXISTS idx_items_hash ON clipboard_items(content_hash);

      CREATE TABLE IF NOT EXISTS outbox_events (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES clipboard_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status, attempts);
    `);
  }

  /**
   * Inserts a clipboard item. If content is identical (same SHA-256 hash), updates captured_at without duplicating.
   */
  public insertOrUpdateItem(input: CreateClipboardItemInput, userId: string = '00000000-0000-0000-0000-000000000000'): { item: ClipboardItem; isDuplicate: boolean } {
    const now = new Date().toISOString();
    const detectedUrl = input.detectedUrl || extractAndSanitizeUrl(input.plainText);
    
    // Auto-detect content type if not explicitly specified
    let contentType = input.contentType || 'text';
    if (contentType === 'text') {
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

    const contentHash = computeContentHash(input.plainText, contentType);

    // Check for existing item with identical hash (Deduplication)
    const existingStmt = this.db.prepare('SELECT * FROM clipboard_items WHERE content_hash = ?');
    const existing = existingStmt.get(contentHash) as any;

    if (existing) {
      // Touch captured_at and updated_at
      const updateStmt = this.db.prepare(`
        UPDATE clipboard_items 
        SET captured_at = ?, updated_at = ? 
        WHERE id = ?
      `);
      updateStmt.run(now, now, existing.id);

      const refreshed = this.getItem(existing.id)!;
      return { item: refreshed, isDuplicate: true };
    }

    const id = randomUUID();
    const deviceId = input.deviceId || 'win-desktop-default';
    const deviceName = input.deviceName || 'Windows Workstation';
    
    // Monotonic sequence count
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM clipboard_items');
    const seqRow = countStmt.get() as { count: number };
    const deviceSequence = (seqRow ? seqRow.count : 0) + 1;

    const contentSizeBytes = Buffer.byteLength(input.plainText, 'utf8');
    const tagsJson = JSON.stringify(input.tags || []);
    const mimeJson = JSON.stringify(input.originalMimeTypes || ['text/plain']);

    const insertStmt = this.db.prepare(`
      INSERT INTO clipboard_items (
        id, user_id, device_id, device_name, device_sequence,
        content_type, original_mime_types, plain_text, detected_url,
        html_content, content_hash, content_size_bytes, attachment_path,
        attachment_url, source_app, is_pinned, is_favorite, tags,
        captured_at, created_at, updated_at, sync_status, retention_policy
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    insertStmt.run(
      id, userId, deviceId, deviceName, deviceSequence,
      contentType, mimeJson, input.plainText, detectedUrl,
      input.htmlContent || null, contentHash, contentSizeBytes, input.attachmentPath || null,
      null, input.sourceApp || null, input.isPinned ? 1 : 0, input.isFavorite ? 1 : 0, tagsJson,
      now, now, now, 'local', 'permanent'
    );

    const item: ClipboardItem = {
      id,
      userId,
      deviceId,
      deviceName,
      deviceSequence,
      contentType,
      originalMimeTypes: input.originalMimeTypes || ['text/plain'],
      plainText: input.plainText,
      detectedUrl,
      htmlContent: input.htmlContent || null,
      contentHash,
      contentSizeBytes,
      attachmentPath: input.attachmentPath || null,
      attachmentUrl: null,
      sourceApp: input.sourceApp || null,
      isPinned: !!input.isPinned,
      isFavorite: !!input.isFavorite,
      tags: input.tags || [],
      capturedAt: now,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local',
      retentionPolicy: 'permanent'
    };

    // Enqueue Outbox Sync Event
    const outboxStmt = this.db.prepare(`
      INSERT INTO outbox_events (
        id, item_id, user_id, device_id, event_type, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    outboxStmt.run(
      randomUUID(), id, userId, deviceId, 'INSERT', JSON.stringify(item), now
    );

    return { item, isDuplicate: false };
  }

  /**
   * Directly upserts a remote item received from peer devices via Cloud Sync.
   * Merges conflicts using mergeClipboardItems without enqueueing an outbox event (prevents echo loops).
   */
  public upsertRemoteItem(remote: ClipboardItem): { item: ClipboardItem; isUpdated: boolean } {
    // Check if item exists by contentHash or id
    const existingByHashStmt = this.db.prepare('SELECT * FROM clipboard_items WHERE content_hash = ?');
    const existingRow = existingByHashStmt.get(remote.contentHash) as any;

    if (existingRow) {
      const localItem = this.mapRowToItem(existingRow);
      const merged = mergeClipboardItems(localItem, remote);

      const updateStmt = this.db.prepare(`
        UPDATE clipboard_items 
        SET is_pinned = ?, is_favorite = ?, tags = ?, captured_at = ?, updated_at = ?, sync_status = 'synced'
        WHERE id = ?
      `);

      updateStmt.run(
        merged.isPinned ? 1 : 0,
        merged.isFavorite ? 1 : 0,
        JSON.stringify(merged.tags),
        merged.capturedAt,
        merged.updatedAt,
        localItem.id
      );

      return { item: merged, isUpdated: true };
    }

    // Insert new remote item
    const insertStmt = this.db.prepare(`
      INSERT INTO clipboard_items (
        id, user_id, device_id, device_name, device_sequence,
        content_type, original_mime_types, plain_text, detected_url,
        html_content, content_hash, content_size_bytes, attachment_path,
        attachment_url, source_app, is_pinned, is_favorite, tags,
        captured_at, created_at, updated_at, sync_status, retention_policy
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    insertStmt.run(
      remote.id,
      remote.userId,
      remote.deviceId,
      remote.deviceName,
      remote.deviceSequence,
      remote.contentType,
      JSON.stringify(remote.originalMimeTypes),
      remote.plainText,
      remote.detectedUrl || null,
      remote.htmlContent || null,
      remote.contentHash,
      remote.contentSizeBytes,
      remote.attachmentPath || null,
      remote.attachmentUrl || null,
      remote.sourceApp || null,
      remote.isPinned ? 1 : 0,
      remote.isFavorite ? 1 : 0,
      JSON.stringify(remote.tags),
      remote.capturedAt,
      remote.createdAt,
      remote.updatedAt,
      'synced',
      remote.retentionPolicy
    );

    return { item: { ...remote, syncStatus: 'synced' }, isUpdated: false };
  }

  public updateItemSyncStatus(id: string, syncStatus: SyncState): void {
    const stmt = this.db.prepare('UPDATE clipboard_items SET sync_status = ? WHERE id = ?');
    stmt.run(syncStatus, id);
  }

  public getItem(id: string): ClipboardItem | null {
    const stmt = this.db.prepare('SELECT * FROM clipboard_items WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRowToItem(row);
  }

  public listItems(filters: ClipboardFilterOptions = {}): { items: ClipboardItem[]; total: number } {
    let whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.contentType) {
      whereClauses.push('content_type = ?');
      params.push(filters.contentType);
    }

    if (filters.isPinned !== undefined) {
      whereClauses.push('is_pinned = ?');
      params.push(filters.isPinned ? 1 : 0);
    }

    if (filters.isFavorite !== undefined) {
      whereClauses.push('is_favorite = ?');
      params.push(filters.isFavorite ? 1 : 0);
    }

    if (filters.query) {
      whereClauses.push('(plain_text LIKE ? OR detected_url LIKE ? OR source_app LIKE ?)');
      const q = `%${filters.query}%`;
      params.push(q, q, q);
    }

    const whereStr = whereClauses.join(' AND ');

    // Get count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM clipboard_items WHERE ${whereStr}`);
    const countRow = countStmt.get(...params) as { count: number };
    const total = countRow ? countRow.count : 0;

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const selectStmt = this.db.prepare(`
      SELECT * FROM clipboard_items 
      WHERE ${whereStr} 
      ORDER BY captured_at DESC, device_sequence DESC 
      LIMIT ? OFFSET ?
    `);

    const rows = selectStmt.all(...params, limit, offset) as any[];
    const items = rows.map((r) => this.mapRowToItem(r));

    return { items, total };
  }

  public togglePin(id: string): boolean {
    const item = this.getItem(id);
    if (!item) return false;
    const newPinned = item.isPinned ? 0 : 1;
    const stmt = this.db.prepare('UPDATE clipboard_items SET is_pinned = ?, updated_at = ? WHERE id = ?');
    stmt.run(newPinned, new Date().toISOString(), id);
    return newPinned === 1;
  }

  public toggleFavorite(id: string): boolean {
    const item = this.getItem(id);
    if (!item) return false;
    const newFav = item.isFavorite ? 0 : 1;
    const stmt = this.db.prepare('UPDATE clipboard_items SET is_favorite = ?, updated_at = ? WHERE id = ?');
    stmt.run(newFav, new Date().toISOString(), id);
    return newFav === 1;
  }

  public deleteItem(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM clipboard_items WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  public getPendingOutbox(limit: number = 20): SyncOutboxEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM outbox_events 
      WHERE status = 'pending' OR (status = 'failed' AND attempts < 5)
      ORDER BY created_at ASC 
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      userId: r.user_id,
      deviceId: r.device_id,
      eventType: r.event_type,
      payloadJson: r.payload_json,
      attempts: r.attempts,
      lastAttemptAt: r.last_attempt_at,
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at
    }));
  }

  public markOutboxCompleted(id: string): void {
    const stmt = this.db.prepare(`UPDATE outbox_events SET status = 'completed' WHERE id = ?`);
    stmt.run(id);
  }

  public markOutboxFailed(id: string, error: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE outbox_events 
      SET status = 'failed', attempts = attempts + 1, last_attempt_at = ?, error_message = ? 
      WHERE id = ?
    `);
    stmt.run(now, error, id);
  }

  public getStats(): { totalItems: number; pinnedItems: number; favoriteItems: number; storageSizeBytes: number } {
    const row = this.db.prepare(`
      SELECT 
        COUNT(*) as totalItems,
        SUM(CASE WHEN is_pinned = 1 THEN 1 ELSE 0 END) as pinnedItems,
        SUM(CASE WHEN is_favorite = 1 THEN 1 ELSE 0 END) as favoriteItems,
        SUM(content_size_bytes) as storageSizeBytes
      FROM clipboard_items
    `).get() as any;

    return {
      totalItems: row?.totalItems || 0,
      pinnedItems: row?.pinnedItems || 0,
      favoriteItems: row?.favoriteItems || 0,
      storageSizeBytes: row?.storageSizeBytes || 0
    };
  }

  public close(): void {
    this.db.close();
  }

  private mapRowToItem(row: any): ClipboardItem {
    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceSequence: row.device_sequence,
      contentType: row.content_type,
      originalMimeTypes: JSON.parse(row.original_mime_types || '[]'),
      plainText: row.plain_text,
      detectedUrl: row.detected_url,
      htmlContent: row.html_content,
      contentHash: row.content_hash,
      contentSizeBytes: row.content_size_bytes,
      attachmentPath: row.attachment_path,
      attachmentUrl: row.attachment_url,
      sourceApp: row.source_app,
      isPinned: row.is_pinned === 1,
      isFavorite: row.is_favorite === 1,
      tags: JSON.parse(row.tags || '[]'),
      capturedAt: row.captured_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status,
      retentionPolicy: row.retention_policy
    };
  }
}
