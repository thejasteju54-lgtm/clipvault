import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { VaultDatabase } from '../../packages/desktop-agent/src/db/vaultDb.js';
import { SyncEngine } from '../../packages/desktop-agent/src/sync/syncEngine.js';
import { 
  InMemorySyncAdapter, 
  mergeClipboardItems,
  computeBackoffDelay,
  computeIdempotencyKey,
  ClipboardItem
} from '@clipvault/shared';

test('Backoff & Jitter: Computes bounded exponential backoff delay', () => {
  const d0 = computeBackoffDelay(0, 1000, 30000, 0.1);
  assert.ok(d0 >= 900 && d0 <= 1100, `Delay 0 should be ~1000ms: got ${d0}`);

  const d1 = computeBackoffDelay(1, 1000, 30000, 0.1);
  assert.ok(d1 >= 1800 && d1 <= 2200, `Delay 1 should be ~2000ms: got ${d1}`);

  const d5 = computeBackoffDelay(5, 1000, 30000, 0.1);
  assert.ok(d5 <= 33000, `Delay 5 should be capped near 30000ms: got ${d5}`);
});

test('Conflict Resolution: Merges duplicate items with sticky pins, tag union, and earliest capture timestamp', () => {
  const localItem: ClipboardItem = {
    id: 'item-local-123',
    userId: 'user-1',
    deviceId: 'win-1',
    deviceName: 'Windows PC',
    deviceSequence: 1,
    contentType: 'text',
    originalMimeTypes: ['text/plain'],
    plainText: 'Shared important note',
    contentHash: 'hash-abc-123',
    contentSizeBytes: 21,
    isPinned: true,
    isFavorite: false,
    tags: ['work', 'urgent'],
    capturedAt: '2026-10-17T10:00:00.000Z',
    createdAt: '2026-10-17T10:00:00.000Z',
    updatedAt: '2026-10-17T10:05:00.000Z',
    syncStatus: 'local',
    retentionPolicy: 'permanent'
  };

  const remoteItem: ClipboardItem = {
    id: 'item-remote-456',
    userId: 'user-1',
    deviceId: 'android-1',
    deviceName: 'Samsung Galaxy A17 5G',
    deviceSequence: 5,
    contentType: 'text',
    originalMimeTypes: ['text/plain'],
    plainText: 'Shared important note',
    contentHash: 'hash-abc-123',
    contentSizeBytes: 21,
    isPinned: false,
    isFavorite: true,
    tags: ['mobile', 'work'],
    capturedAt: '2026-10-17T09:55:00.000Z', // Captured earlier on phone
    createdAt: '2026-10-17T09:55:00.000Z',
    updatedAt: '2026-10-17T10:10:00.000Z', // Updated later on phone
    syncStatus: 'synced',
    retentionPolicy: 'permanent'
  };

  const merged = mergeClipboardItems(localItem, remoteItem);

  assert.equal(merged.id, localItem.id, 'Retains local primary ID');
  assert.equal(merged.capturedAt, '2026-10-17T09:55:00.000Z', 'Preserves earliest true capture timestamp');
  assert.equal(merged.updatedAt, '2026-10-17T10:10:00.000Z', 'LWW updates latest metadata timestamp');
  assert.equal(merged.isPinned, true, 'Sticky pin preserved');
  assert.equal(merged.isFavorite, true, 'Sticky favorite preserved');
  assert.deepEqual(merged.tags.sort(), ['mobile', 'urgent', 'work'].sort(), 'Tags correctly unioned without duplicates');
  assert.equal(merged.syncStatus, 'synced');
});

test('SyncEngine: Online capture, outbox drain, and cloud persistence', async () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-sync-online-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);
  const cloudAdapter = new InMemorySyncAdapter();
  const userId = '00000000-0000-0000-0000-000000000001';
  const deviceId = 'win-test-dev-1';

  const engine = new SyncEngine({
    db,
    cloudAdapter,
    userId,
    deviceId,
    deviceName: 'Windows Test Agent',
    syncIntervalMs: 1000
  });

  try {
    await engine.start();

    // Insert item
    const { item } = db.insertOrUpdateItem({
      plainText: 'Online sync verification token 987654',
      deviceId,
      deviceName: 'Windows Test Agent'
    }, userId);

    assert.equal(item.syncStatus, 'local');

    // Trigger sync
    const res = await engine.syncPendingOutbox();
    assert.equal(res.processed, 1);
    assert.equal(res.succeeded, 1);

    // Verify local item updated to synced
    const localItemAfter = db.getItem(item.id);
    assert.equal(localItemAfter?.syncStatus, 'synced');

    // Verify cloud has item
    const cloudItems = await cloudAdapter.fetchClipboardItems(userId);
    assert.equal(cloudItems.data.length, 1);
    assert.equal(cloudItems.data[0].contentHash, item.contentHash);

  } finally {
    engine.stop();
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('SyncEngine: Offline queueing, network failure resistance, and recovery', async () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-sync-offline-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);
  const cloudAdapter = new InMemorySyncAdapter();
  const userId = '00000000-0000-0000-0000-000000000001';
  const deviceId = 'win-test-dev-2';

  const engine = new SyncEngine({
    db,
    cloudAdapter,
    userId,
    deviceId,
    deviceName: 'Windows Test Agent'
  });

  try {
    await engine.start();

    // 1. Simulate network disconnect
    cloudAdapter.isOnline = false;

    // 2. Capture items while completely offline
    const item1 = db.insertOrUpdateItem({ plainText: 'Offline item 1' }, userId).item;
    const item2 = db.insertOrUpdateItem({ plainText: 'Offline item 2' }, userId).item;

    assert.equal(db.getPendingOutbox().length, 2, '2 events queued in local outbox');

    // 3. Attempt sync while offline -> must record failure, but NOT lose data
    const syncResOffline = await engine.syncPendingOutbox();
    assert.equal(syncResOffline.failed, 2);
    assert.equal(db.getItem(item1.id)?.syncStatus, 'local');

    // 4. Restore network connectivity
    cloudAdapter.isOnline = true;

    // 5. Run sync -> outbox drains successfully
    const syncResOnline = await engine.syncPendingOutbox();
    assert.equal(syncResOnline.succeeded, 2);
    assert.equal(db.getPendingOutbox().length, 0, 'Outbox completely drained');

    // 6. Verify cloud has both items
    const cloudItems = await cloudAdapter.fetchClipboardItems(userId);
    assert.equal(cloudItems.data.length, 2);

  } finally {
    engine.stop();
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('SyncEngine: Idempotency prevents duplication on repeated retries', async () => {
  const cloudAdapter = new InMemorySyncAdapter();
  const userId = 'user-idempotency-test';
  const item: ClipboardItem = {
    id: 'item-idem-1',
    userId,
    deviceId: 'device-1',
    deviceName: 'Test Device',
    deviceSequence: 1,
    contentType: 'text',
    originalMimeTypes: ['text/plain'],
    plainText: 'Idempotent test string',
    contentHash: 'hash-idem-12345',
    contentSizeBytes: 22,
    isPinned: false,
    isFavorite: false,
    tags: ['test'],
    capturedAt: '2026-10-17T12:00:00.000Z',
    createdAt: '2026-10-17T12:00:00.000Z',
    updatedAt: '2026-10-17T12:00:00.000Z',
    syncStatus: 'local',
    retentionPolicy: 'permanent'
  };

  const key1 = computeIdempotencyKey(item.id, 'INSERT', 1);
  const res1 = await cloudAdapter.upsertClipboardItem(item, key1);
  assert.equal(res1.success, true);
  assert.equal(res1.isDuplicate, undefined);

  // Send exact same item again with same hash
  const res2 = await cloudAdapter.upsertClipboardItem(item, key1);
  assert.equal(res2.success, true);
  assert.equal(res2.isDuplicate, true, 'Second upload must be recognized as duplicate');

  // Verify only 1 record exists in cloud
  const list = await cloudAdapter.fetchClipboardItems(userId);
  assert.equal(list.data.length, 1);
});

test('SyncEngine: Device Revocation immediately blocks access', async () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-sync-revoke-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);
  const cloudAdapter = new InMemorySyncAdapter();
  const userId = 'user-device-test';
  const deviceId = 'compromised-laptop';

  const engine = new SyncEngine({
    db,
    cloudAdapter,
    userId,
    deviceId,
    deviceName: 'Compromised Laptop'
  });

  try {
    await engine.start();

    // Revoke device
    await cloudAdapter.revokeDevice(deviceId, userId);

    // Any subsequent sync attempt must be rejected
    await assert.rejects(
      async () => {
        await engine.syncPendingOutbox();
      },
      /revoked/i,
      'Revoked device must not be allowed to sync'
    );

  } finally {
    engine.stop();
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('SyncEngine & Realtime: Peer device sync and echo prevention', async () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-sync-realtime-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);
  const cloudAdapter = new InMemorySyncAdapter();
  const userId = 'user-realtime-test';
  const localDeviceId = 'win-workstation-local';

  const engine = new SyncEngine({
    db,
    cloudAdapter,
    userId,
    deviceId: localDeviceId,
    deviceName: 'Windows Local'
  });

  try {
    await engine.start();

    // 1. Simulate peer device (Samsung Galaxy phone) uploading an item
    const phoneItem: ClipboardItem = {
      id: 'phone-item-777',
      userId,
      deviceId: 'samsung-galaxy-a17',
      deviceName: 'Samsung Galaxy A17 5G',
      deviceSequence: 10,
      contentType: 'url',
      originalMimeTypes: ['text/plain'],
      plainText: 'https://news.ycombinator.com',
      detectedUrl: 'https://news.ycombinator.com',
      contentHash: 'hash-hacker-news',
      contentSizeBytes: 28,
      isPinned: true,
      isFavorite: false,
      tags: ['tech'],
      capturedAt: '2026-10-17T12:30:00.000Z',
      createdAt: '2026-10-17T12:30:00.000Z',
      updatedAt: '2026-10-17T12:30:00.000Z',
      syncStatus: 'synced',
      retentionPolicy: 'permanent'
    };

    // Upsert on cloud adapter -> broadcast triggers subscriber in engine
    await cloudAdapter.upsertClipboardItem(phoneItem);

    // Verify local DB received and saved the phone's item
    const localSaved = db.getItem('phone-item-777');
    assert.ok(localSaved, 'Local SQLite must ingest peer device item via Realtime');
    assert.equal(localSaved?.detectedUrl, 'https://news.ycombinator.com');
    assert.equal(localSaved?.isPinned, true);

    // Verify outbox did NOT enqueue a redundant event (no echo loop!)
    assert.equal(db.getPendingOutbox().length, 0, 'Peer item ingestion must not create outbox echo');

  } finally {
    engine.stop();
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('Backend Security: IDOR isolation between users', async () => {
  const cloudAdapter = new InMemorySyncAdapter();
  const userA = 'user-alice-111';
  const userB = 'user-bob-222';

  const itemA: ClipboardItem = {
    id: 'item-alice-1',
    userId: userA,
    deviceId: 'alice-device',
    deviceName: "Alice's Laptop",
    deviceSequence: 1,
    contentType: 'text',
    originalMimeTypes: ['text/plain'],
    plainText: 'Alice secret notes',
    contentHash: 'hash-alice-1',
    contentSizeBytes: 18,
    isPinned: false,
    isFavorite: false,
    tags: [],
    capturedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
    retentionPolicy: 'permanent'
  };

  await cloudAdapter.upsertClipboardItem(itemA);

  // Bob queries items -> should see 0 items
  const bobItems = await cloudAdapter.fetchClipboardItems(userB);
  assert.equal(bobItems.data.length, 0, "Bob cannot view Alice's items");

  // Bob attempts to delete Alice's item -> should fail IDOR check
  const deleteRes = await cloudAdapter.deleteClipboardItem(itemA.id, userB);
  assert.equal(deleteRes.success, false, "Bob cannot delete Alice's item");

  // Alice can delete her own item
  const aliceDelete = await cloudAdapter.deleteClipboardItem(itemA.id, userA);
  assert.equal(aliceDelete.success, true);
});
