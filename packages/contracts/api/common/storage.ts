import * as z from "zod/v4";
import { storageSchemas } from "../modules/storage/permissions";

// Bucket schema
export const bucketSchema = z.object({
  name: z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 
    'Bucket name must be 3-63 chars, lowercase, start/end with alphanumeric'),
  creationDate: z.date(),
});

// Object schema
export const objectSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().min(0),
  etag: z.string(),
  lastModified: z.date(),
  contentType: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

// Object list result schema
export const objectListSchema = z.object({
  objects: z.array(objectSchema),
  prefixes: z.array(z.string()),
  isTruncated: z.boolean(),
  nextContinuationToken: z.string().optional(),
});

// Upload result schema
export const uploadResultSchema = z.object({
  etag: z.string(),
  versionId: z.string().optional(),
});

// API Key permissions schema (shared across all API key endpoints)
export const apiKeyPermissionsSchema = z.object({
  bucket: z.array(storageSchemas.actions.forResource('bucket')).optional(),
  object: z.array(storageSchemas.actions.forResource('object')).optional(),
  presigned: z.array(storageSchemas.actions.forResource('presigned')).optional(),
  multipart: z.array(storageSchemas.actions.forResource('multipart')).optional(),
});

// API Key entity schema (full database model)
export const apiKeySchema = z.object({
  id: z.uuid(),
  keyPrefix: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: apiKeyPermissionsSchema,
  bucketIds: z.array(z.string()).nullable(),
  allowedPrefixes: z.array(z.string()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()),
  createdAt: z.date(),
  expiresAt: z.date().nullable(),
  lastUsedAt: z.date().nullable(),
  lastUsedIp: z.string().nullable(),
  revokedAt: z.date().nullable(),
  revokedReason: z.string().nullable(),
  rateLimitPerMinute: z.number().nullable(),
  rateLimitPerDay: z.number().nullable(),
});
