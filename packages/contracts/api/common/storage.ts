import { z } from "zod/v4";

// Bucket schema
export const bucketSchema = z.object({
  name: z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 
    'Bucket name must be 3-63 chars, lowercase, start/end with alphanumeric'),
  creationDate: z.iso.datetime(),
});

// Object schema
export const objectSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().min(0),
  etag: z.string(),
  lastModified: z.iso.datetime(),
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
