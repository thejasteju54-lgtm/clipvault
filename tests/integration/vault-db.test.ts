import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { VaultDatabase } from '../../packages/desktop-agent/src/db/vaultDb.js';

test('VaultDatabase: Inserts, deduplicates, and retrieves clipboard items', () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-vault-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);

  try {
    // 1. Insert item
    const res1 = db.insertOrUpdateItem({
      plainText: 'https://github.com/thejasteju54-lgtm/clipvault?ref=direct',
      sourceApp: 'brave.exe'
    });

    assert.equal(res1.isDuplicate, false);
    assert.equal(res1.item.contentType, 'url');
    assert.ok(res1.item.detectedUrl?.includes('clipvault'));
    assert.ok(!res1.item.detectedUrl?.includes('ref=direct'), 'Tracking query should be sanitized');

    // 2. Insert duplicate
    const res2 = db.insertOrUpdateItem({
      plainText: 'https://github.com/thejasteju54-lgtm/clipvault?ref=direct',
      sourceApp: 'brave.exe'
    });

    assert.equal(res2.isDuplicate, true, 'Duplicate content must be flagged');
    assert.equal(res2.item.id, res1.item.id, 'Duplicate must share identical ID');

    // Total count must be 1
    const { items, total } = db.listItems();
    assert.equal(total, 1);
    assert.equal(items.length, 1);

    // 3. Insert code snippet
    const resCode = db.insertOrUpdateItem({
      plainText: 'SELECT id, user_id FROM devices WHERE is_revoked = false;',
      sourceApp: 'datagrip.exe'
    });
    assert.equal(resCode.item.contentType, 'code');

    // 4. Search
    const searchRes = db.listItems({ query: 'SELECT' });
    assert.equal(searchRes.items.length, 1);
    assert.equal(searchRes.items[0].contentType, 'code');

    // 5. Pin toggle
    const isPinned = db.togglePin(res1.item.id);
    assert.equal(isPinned, true);
    assert.equal(db.getItem(res1.item.id)?.isPinned, true);

    // 6. Outbox verification
    const outbox = db.getPendingOutbox();
    assert.ok(outbox.length >= 2, 'Both inserted items must be enqueued into durable outbox');
    assert.equal(outbox[0].status, 'pending');

    db.markOutboxCompleted(outbox[0].id);
    const pendingAfter = db.getPendingOutbox();
    assert.equal(pendingAfter.length, outbox.length - 1);

    // 7. Stats
    const stats = db.getStats();
    assert.equal(stats.totalItems, 2);
    assert.equal(stats.pinnedItems, 1);

  } finally {
    db.close();
    // Clean up temporary database files
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('VaultDatabase Persistence: Data survives database close and reopen', () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-persist-${Date.now()}.sqlite`);
  let db = new VaultDatabase(tempDbPath);
  let savedId = '';

  try {
    const { item } = db.insertOrUpdateItem({
      plainText: 'Permanent persistence test string across app restart'
    });
    savedId = item.id;
    db.close();

    // Reopen database
    db = new VaultDatabase(tempDbPath);
    const restored = db.getItem(savedId);

    assert.ok(restored, 'Item must exist after database reopen');
    assert.equal(restored?.plainText, 'Permanent persistence test string across app restart');
  } finally {
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});
