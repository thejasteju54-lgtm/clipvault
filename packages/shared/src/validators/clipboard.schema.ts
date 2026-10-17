import { z } from 'zod';

export const ContentTypeSchema = z.enum([
  'text',
  'url',
  'code',
  'rich_text',
  'image',
  'file_ref'
]);

export const SyncStateSchema = z.enum([
  'local',
  'pending_sync',
  'synced',
  'failed'
]);

export const RetentionPolicySchema = z.enum([
  'permanent',
  '30_days',
  'session_only'
]);

export const ClipboardItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().min(1).max(128),
  deviceName: z.string().min(1).max(128),
  deviceSequence: z.number().int().nonnegative(),
  contentType: ContentTypeSchema,
  originalMimeTypes: z.array(z.string().min(1)),
  plainText: z.string(),
  detectedUrl: z.string().url().nullable().optional(),
  htmlContent: z.string().nullable().optional(),
  contentHash: z.string().length(64), // SHA-256 hex string
  contentSizeBytes: z.number().int().nonnegative(),
  attachmentPath: z.string().nullable().optional(),
  attachmentUrl: z.string().url().nullable().optional(),
  sourceApp: z.string().max(256).nullable().optional(),
  isPinned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(64)).default([]),
  capturedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  syncStatus: SyncStateSchema.default('local'),
  retentionPolicy: RetentionPolicySchema.default('permanent'),
  isSensitive: z.boolean().optional()
});

export const CreateClipboardItemInputSchema = z.object({
  plainText: z.string().min(1, 'Clipboard content cannot be empty'),
  contentType: ContentTypeSchema.optional(),
  originalMimeTypes: z.array(z.string()).optional(),
  htmlContent: z.string().nullable().optional(),
  detectedUrl: z.string().url().nullable().optional(),
  attachmentPath: z.string().nullable().optional(),
  sourceApp: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional()
});

export const RegisteredDeviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().min(1).max(128),
  deviceName: z.string().min(1).max(128),
  platform: z.enum(['android', 'windows', 'web', 'macos', 'linux']),
  osVersion: z.string().max(64),
  appVersion: z.string().max(32),
  lastSeenAt: z.string().datetime(),
  isRevoked: z.boolean().default(false),
  registeredAt: z.string().datetime()
});
