import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  bigint,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Buckets table - Stores S3-compatible bucket metadata
 */
export const bucket = pgTable(
  "bucket",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bucket_name_idx").on(table.name),
    index("bucket_owner_id_idx").on(table.ownerId),
  ],
);

/**
 * Objects table - Stores S3-compatible object metadata
 * The actual file data is stored on the filesystem
 */
export const object = pgTable(
  "object",
  {
    id: text("id").primaryKey(),
    bucketId: text("bucket_id")
      .notNull()
      .references(() => bucket.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // Object key/path within bucket
    size: bigint("size", { mode: "number" }).notNull(), // File size in bytes
    etag: text("etag").notNull(), // MD5 hash for integrity
    contentType: text("content_type").notNull().default("application/octet-stream"),
    metadata: jsonb("metadata").$type<Record<string, string>>(), // Custom metadata
    versionId: text("version_id"), // For versioning support (future)
    isDeleteMarker: text("is_delete_marker"), // For soft deletes (future)
    storageClass: text("storage_class").default("STANDARD"), // S3 storage class
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Unique constraint on bucket + key (S3 behavior)
    uniqueIndex("object_bucket_key_idx").on(table.bucketId, table.key),
    index("object_bucket_id_idx").on(table.bucketId),
    index("object_key_idx").on(table.key),
    index("object_etag_idx").on(table.etag),
  ],
);

/**
 * Multipart uploads table - Tracks multipart upload sessions
 */
export const multipartUpload = pgTable(
  "multipart_upload",
  {
    id: text("id").primaryKey(),
    uploadId: text("upload_id").notNull().unique(), // S3 upload ID
    bucketId: text("bucket_id")
      .notNull()
      .references(() => bucket.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    contentType: text("content_type"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"), // Optional expiry
  },
  (table) => [
    index("multipart_upload_id_idx").on(table.uploadId),
    index("multipart_bucket_key_idx").on(table.bucketId, table.key),
  ],
);

/**
 * Multipart upload parts table - Tracks individual parts of a multipart upload
 */
export const multipartUploadPart = pgTable(
  "multipart_upload_part",
  {
    id: text("id").primaryKey(),
    uploadId: text("upload_id")
      .notNull()
      .references(() => multipartUpload.uploadId, { onDelete: "cascade" }),
    partNumber: bigint("part_number", { mode: "number" }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    etag: text("etag").notNull(),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("multipart_part_upload_part_idx").on(table.uploadId, table.partNumber),
    index("multipart_part_upload_id_idx").on(table.uploadId),
  ],
);

// Relations
export const bucketRelations = relations(bucket, ({ one, many }) => ({
  owner: one(user, {
    fields: [bucket.ownerId],
    references: [user.id],
  }),
  objects: many(object),
  multipartUploads: many(multipartUpload),
}));

export const objectRelations = relations(object, ({ one }) => ({
  bucket: one(bucket, {
    fields: [object.bucketId],
    references: [bucket.id],
  }),
}));

export const multipartUploadRelations = relations(multipartUpload, ({ one, many }) => ({
  bucket: one(bucket, {
    fields: [multipartUpload.bucketId],
    references: [bucket.id],
  }),
  parts: many(multipartUploadPart),
}));

export const multipartUploadPartRelations = relations(multipartUploadPart, ({ one }) => ({
  upload: one(multipartUpload, {
    fields: [multipartUploadPart.uploadId],
    references: [multipartUpload.uploadId],
  }),
}));
