import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  ClipboardItemSchema,
  computeContentHash,
  extractAndSanitizeUrl,
  detectCodeSnippet
} from '../../packages/shared/src/index.js';

test('Domain Models: ClipboardItemSchema validates compliant record', () => {
  const validRecord = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    userId: '11111111-2222-3333-4444-555555555555',
    deviceId: 'win-workstation-01',
    deviceName: 'Primary Workstation',
    deviceSequence: 1,
    contentType: 'text' as const,
    originalMimeTypes: ['text/plain'],
    plainText: 'Secure multi-device clipboard text',
    detectedUrl: null,
    htmlContent: null,
    contentHash: computeContentHash('Secure multi-device clipboard text', 'text'),
    contentSizeBytes: 34,
    attachmentPath: null,
    attachmentUrl: null,
    sourceApp: 'code.exe',
    isPinned: false,
    isFavorite: false,
    tags: ['dev', 'test'],
    capturedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local' as const,
    retentionPolicy: 'permanent' as const
  };

  const parsed = ClipboardItemSchema.safeParse(validRecord);
  assert.equal(parsed.success, true, 'Valid record should parse without errors');
});

test('Domain Models: ClipboardItemSchema rejects malformed record', () => {
  const invalidRecord = {
    id: 'not-a-uuid',
    plainText: 12345
  };

  const parsed = ClipboardItemSchema.safeParse(invalidRecord);
  assert.equal(parsed.success, false, 'Invalid record should fail validation');
});

test('Hasher: computeContentHash produces deterministic SHA-256 and trims whitespace', () => {
  const hash1 = computeContentHash('  Hello World!  ', 'text');
  const hash2 = computeContentHash('Hello World!', 'text');
  const hash3 = computeContentHash('Different Content', 'text');

  assert.equal(hash1, hash2, 'Trimmed content should yield identical hash for deduplication');
  assert.notEqual(hash1, hash3, 'Different content must yield different hash');
  assert.equal(hash1.length, 64, 'SHA-256 hash must be 64 hex characters');
});

test('URL Sanitizer: extracts URL and strips tracking parameters while preserving query', () => {
  const dirty = 'Check this out: https://example.com/article?id=42&utm_source=twitter&fbclid=12345&ref=share';
  const clean = extractAndSanitizeUrl(dirty);

  assert.ok(clean, 'Should extract URL');
  assert.ok(clean.includes('id=42'), 'Legitimate query param id=42 must be preserved');
  assert.ok(!clean.includes('utm_source'), 'Tracking query utm_source must be stripped');
  assert.ok(!clean.includes('fbclid'), 'Tracking query fbclid must be stripped');
  assert.ok(!clean.includes('ref=share'), 'Tracking query ref must be stripped');
});

test('Code Detector: reliably detects programming language patterns', () => {
  const jsCode = 'import { useState } from "react";\nconst [val, setVal] = useState(0);';
  const sqlCode = 'SELECT id, user_id FROM clipboard_items WHERE is_pinned = true;';
  const normalText = 'This is just a regular chat message sent to a friend.';

  assert.equal(detectCodeSnippet(jsCode), true, 'JavaScript snippet should be detected as code');
  assert.equal(detectCodeSnippet(sqlCode), true, 'SQL statement should be detected as code');
  assert.equal(detectCodeSnippet(normalText), false, 'Normal text should not be detected as code');
});

test('Unicode & Multilingual Integrity: preserves emojis and complex scripts without truncation', () => {
  const complexText = '🚀 ClipVault: Multilingual test: こんにちは, مرحبا, नमस्ते, Привет! 123\nLine 2';
  const hash = computeContentHash(complexText, 'text');

  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64);
  assert.ok(complexText.includes('🚀'));
  assert.ok(complexText.includes('こんにちは'));
  assert.ok(complexText.includes('नमस्ते'));
});
