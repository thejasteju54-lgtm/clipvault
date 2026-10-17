import { computeContentHash } from '../utils/hasher.js';

/**
 * Computes exponential backoff delay with randomized jitter.
 * 
 * Formula: min(maxMs, baseMs * 2^attempts) +/- (jitterRatio * computedDelay)
 */
export function computeBackoffDelay(
  attempts: number,
  baseMs: number = 1000,
  maxMs: number = 30000,
  jitterRatio: number = 0.2
): number {
  const boundedAttempts = Math.max(0, Math.min(attempts, 10));
  const rawDelay = Math.min(maxMs, baseMs * Math.pow(2, boundedAttempts));
  
  // Random jitter in range [-jitterRatio, +jitterRatio]
  const jitterOffset = (Math.random() * 2 - 1) * jitterRatio * rawDelay;
  const finalDelay = Math.max(100, Math.round(rawDelay + jitterOffset));

  return finalDelay;
}

/**
 * Generates deterministic idempotency key for outbox synchronization.
 * Prevents duplicate server-side writes on network retries.
 */
export function computeIdempotencyKey(
  itemId: string,
  eventType: string,
  sequenceOrTimestamp: string | number
): string {
  const rawPayload = `${itemId}:${eventType}:${sequenceOrTimestamp}`;
  return computeContentHash(rawPayload, 'text');
}
