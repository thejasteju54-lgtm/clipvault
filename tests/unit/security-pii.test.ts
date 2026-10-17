import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubForLogs, formatSafeLog } from '../../packages/shared/src/index.js';

test('Security & PII: scrubForLogs redacts long secrets and truncates user IDs', () => {
  const secretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.somerandomtokendatahere';
  const scrubbed = scrubForLogs({
    userId: '98765432-abcd-ef01-2345-6789abcdef01',
    recordId: '11111111-2222-3333-4444-555555555555',
    error: `Authentication failed with token ${secretKey}`
  });

  assert.equal(scrubbed.userId, '98765432...', 'User ID should be truncated in logs');
  assert.equal(scrubbed.recordId, '11111111-2222-3333-4444-555555555555');
  assert.ok(!JSON.stringify(scrubbed).includes(secretKey), 'Secret token must be redacted from log output');
  assert.ok(JSON.stringify(scrubbed).includes('[REDACTED_SECRET]'), 'Secret should be replaced with redaction placeholder');
});

test('Security & PII: formatSafeLog generates structured, plaintext-free log string', () => {
  const logLine = formatSafeLog('INFO', 'Item persisted to local storage', {
    recordId: '12345',
    contentType: 'text',
    contentSizeBytes: 1024
  });

  assert.ok(logLine.includes('[INFO]'));
  assert.ok(logLine.includes('Item persisted to local storage'));
  assert.ok(logLine.includes('"contentSizeBytes":1024'));
});
