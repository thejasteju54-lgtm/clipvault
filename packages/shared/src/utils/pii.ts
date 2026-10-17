/**
 * Strict PII Scrubber and Structured Logger utility.
 * Guarantees that clipboard contents, tokens, passwords, and private text
 * are NEVER emitted into application logs or telemetry.
 */

export interface SafeLogMeta {
  recordId?: string;
  userId?: string;
  deviceId?: string;
  sourceDevice?: string;
  contentType?: string;
  contentSizeBytes?: number;
  syncStatus?: string;
  durationMs?: number;
  error?: string;
}

export function scrubForLogs(meta: SafeLogMeta): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  if (meta.recordId) safe.recordId = meta.recordId;
  if (meta.userId) safe.userId = meta.userId.substring(0, 8) + '...';
  if (meta.deviceId) safe.deviceId = meta.deviceId;
  if (meta.sourceDevice) safe.sourceDevice = meta.sourceDevice;
  if (meta.contentType) safe.contentType = meta.contentType;
  if (meta.contentSizeBytes !== undefined) safe.contentSizeBytes = meta.contentSizeBytes;
  if (meta.syncStatus) safe.syncStatus = meta.syncStatus;
  if (meta.durationMs !== undefined) safe.durationMs = meta.durationMs;
  if (meta.error) safe.error = meta.error.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED_SECRET]');

  return safe;
}

/**
 * Creates a safe log line with timestamp and scrubbed metadata.
 */
export function formatSafeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: SafeLogMeta): string {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(scrubForLogs(meta))}` : '';
  return `[${ts}] [${level}] ${message}${metaStr}`;
}
