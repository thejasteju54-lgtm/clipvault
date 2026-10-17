import { createHash } from 'node:crypto';

/**
 * Calculates a deterministic SHA-256 hex hash of the normalized clipboard content.
 * Used for instant duplicate detection and outbox idempotency keys.
 */
export function computeContentHash(content: string, type: string = 'text'): string {
  const normalized = `${type}:${content.trim()}`;
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Generates an idempotency key combining user ID, device ID, and content hash.
 */
export function generateSyncIdempotencyKey(userId: string, contentHash: string): string {
  return `${userId}:${contentHash}`;
}
