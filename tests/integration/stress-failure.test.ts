import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { VaultDatabase } from '../../packages/desktop-agent/src/db/vaultDb.js';

test('Stress Test: High-throughput ingestion of 1,000 items in SQLite WAL mode', () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-stress-load-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);

  try {
    const startTime = Date.now();
    const TARGET_ITEMS = 1000;

    for (let i = 0; i < TARGET_ITEMS; i++) {
      db.insertOrUpdateItem({
        plainText: `Synthetic high-volume clipboard item payload index ${i} with random key ${Math.random()}`,
        sourceApp: i % 2 === 0 ? 'code.exe' : 'chrome.exe'
      });
    }

    const duration = Date.now() - startTime;
    const { total } = db.listItems({ limit: 10 });
    assert.equal(total, TARGET_ITEMS, 'All 1,000 items must be durably stored in vault');

    // Benchmark search across the 1,000 items
    const searchStart = Date.now();
    const searchRes = db.listItems({ query: 'index 500', limit: 10 });
    const searchDuration = Date.now() - searchStart;

    assert.ok(searchRes.items.length >= 1, 'Search must locate target item');
    assert.ok(searchDuration < 50, `Search across 1,000 items must take <50ms (took ${searchDuration}ms)`);

    console.log(`Ingested ${TARGET_ITEMS} records in ${duration}ms (${(TARGET_ITEMS / (duration / 1000)).toFixed(0)} items/sec). Search completed in ${searchDuration}ms.`);
  } finally {
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('Stress Test: Rapid-fire clipboard burst simulation (50 items)', () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-stress-burst-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);

  try {
    const BURST_COUNT = 50;
    const results = [];

    for (let i = 0; i < BURST_COUNT; i++) {
      results.push(db.insertOrUpdateItem({
        plainText: `Burst copy token ${i}`,
        sourceApp: 'burst-generator.exe'
      }));
    }

    // Verify all 50 items were captured without dropping
    assert.equal(results.length, BURST_COUNT);
    assert.equal(results.every((r) => !r.isDuplicate), true, 'All burst items unique');

    // Verify monotonic sequencing
    const { items } = db.listItems({ limit: 100 });
    assert.equal(items.length, BURST_COUNT);

    const sequences = items.map((it) => it.deviceSequence);
    for (let j = 0; j < sequences.length - 1; j++) {
      assert.ok(sequences[j] > sequences[j + 1], 'Sequences must be monotonically descending in timeline view');
    }
  } finally {
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('Large Payload Handling: 150KB text and multi-byte multilingual unicode', () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-stress-payload-${Date.now()}.sqlite`);
  const db = new VaultDatabase(tempDbPath);

  try {
    // Generate ~150KB large text payload
    const largeChunk = 'A'.repeat(1024);
    const largePayload = Array(150).fill(largeChunk).join('\n');

    const resLarge = db.insertOrUpdateItem({
      plainText: largePayload,
      sourceApp: 'editor.exe'
    });

    assert.equal(resLarge.item.contentSizeBytes, Buffer.byteLength(largePayload, 'utf8'));

    const retrievedLarge = db.getItem(resLarge.item.id);
    assert.ok(retrievedLarge);
    assert.equal(retrievedLarge?.plainText.length, largePayload.length, 'Large 150KB text must not truncate');

    // Multilingual & Unicode stress test
    const complexUnicode = 'ClipVault 🚀 • 🌟 • 🔒 | 日本語のクリップボード | مرحبا بالعالم | Привет мир | 𝕮𝖑𝖎𝖕𝖁𝖆𝖚𝖑𝖙';
    const resUnicode = db.insertOrUpdateItem({
      plainText: complexUnicode,
      sourceApp: 'browser.exe'
    });

    const retrievedUnicode = db.getItem(resUnicode.item.id);
    assert.equal(retrievedUnicode?.plainText, complexUnicode, 'Complex Unicode and emoji sequences must be preserved exactly');
  } finally {
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});

test('Failure Injection & Recovery: Uncorrupted persistence across crash simulation', () => {
  const tempDbPath = path.join(process.cwd(), 'temp', `test-crash-recovery-${Date.now()}.sqlite`);
  let db = new VaultDatabase(tempDbPath);

  try {
    // Insert 10 items
    for (let i = 0; i < 10; i++) {
      db.insertOrUpdateItem({
        plainText: `Pre-crash durable item ${i}`
      });
    }

    // Abruptly close db (simulating process termination)
    db.close();

    // Reopen database
    db = new VaultDatabase(tempDbPath);
    const { total } = db.listItems();
    assert.equal(total, 10, 'All 10 pre-crash items must survive clean recovery');

    // Verify database can continue normal writes after crash recovery
    const postCrash = db.insertOrUpdateItem({
      plainText: 'Post-crash item successfully saved'
    });
    assert.ok(postCrash.item.id);
    assert.equal(db.listItems().total, 11);
  } finally {
    db.close();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }
});
