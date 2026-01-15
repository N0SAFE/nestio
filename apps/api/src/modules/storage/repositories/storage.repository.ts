import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "@/core/modules/database/services/database.service";
import * as schema from "@/config/drizzle/schema";
import { eq, and, like, desc, type InferSelectModel } from "drizzle-orm";
import type {
    BucketInfo,
    ObjectInfo,
} from "../types/storage.types";

@Injectable()
export class StorageRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    // ==================== Bucket Operations ====================

    /**
     * List all buckets
     */
    async listBuckets(): Promise<BucketInfo[]> {
        const db = this.databaseService.db;
        const buckets = await db
            .select({
                name: schema.bucket.name,
                creationDate: schema.bucket.createdAt,
            })
            .from(schema.bucket)
            .orderBy(desc(schema.bucket.createdAt));

        return buckets.map(bucket => ({
            name: bucket.name,
            creationDate: bucket.creationDate,
        }));
    }

    /**
     * Create a new bucket
     */
    async createBucket(name: string, ownerId: string): Promise<void> {
        const db = this.databaseService.db;
        await db.insert(schema.bucket).values({
            name,
            ownerId,
            id: crypto.randomUUID(),
        });
    }

    /**
     * Find a bucket by name
     */
    async findBucketByName(name: string): Promise<{ id: string; name: string; ownerId: string; createdAt: Date } | null> {
        const db = this.databaseService.db;
        const buckets = await db
            .select()
            .from(schema.bucket)
            .where(eq(schema.bucket.name, name))
            .limit(1);

        return buckets[0] ?? null;
    }

    /**
     * Check if a bucket exists
     */
    async bucketExists(name: string): Promise<boolean> {
        const bucket = await this.findBucketByName(name);
        return bucket !== null;
    }

    /**
     * Delete a bucket
     */
    async deleteBucket(name: string): Promise<void> {
        const db = this.databaseService.db;
        await db.delete(schema.bucket).where(eq(schema.bucket.name, name));
    }

    /**
     * Count objects in a bucket
     */
    async countObjectsInBucket(bucketId: string): Promise<number> {
        const db = this.databaseService.db;
        const result = await db
            .select({ count: schema.object.id })
            .from(schema.object)
            .where(eq(schema.object.bucketId, bucketId));

        return result.length;
    }

    // ==================== Object Operations ====================

    /**
     * List objects in a bucket with optional prefix filter
     */
    async listObjects(bucketId: string, prefix?: string, maxKeys?: number): Promise<ObjectInfo[]> {
        const db = this.databaseService.db;
        
        // Build where conditions
        const conditions = [eq(schema.object.bucketId, bucketId)];
        if (prefix) {
            conditions.push(like(schema.object.key, `${prefix}%`));
        }

        const baseQuery = db
            .select({
                key: schema.object.key,
                size: schema.object.size,
                etag: schema.object.etag,
                lastModified: schema.object.updatedAt,
                contentType: schema.object.contentType,
            })
            .from(schema.object)
            .where(and(...conditions))
            .orderBy(schema.object.key);

        const objects = maxKeys 
            ? await baseQuery.limit(maxKeys)
            : await baseQuery;

        return objects.map(obj => ({
            name: obj.key,
            size: obj.size,
            etag: obj.etag,
            lastModified: obj.lastModified,
            contentType: obj.contentType || 'application/octet-stream',
        }));
    }

    /**
     * Create or update an object
     */
    async upsertObject(params: {
        bucketId: string;
        key: string;
        size: number;
        etag: string;
        contentType?: string;
        metadata?: Record<string, string>;
    }): Promise<void> {
        const db = this.databaseService.db;
        
        const existing = await this.findObjectByKey(params.bucketId, params.key);

        if (existing) {
            // Update existing object
            await db
                .update(schema.object)
                .set({
                    size: params.size,
                    etag: params.etag,
                    contentType: params.contentType ?? 'application/octet-stream',
                    metadata: params.metadata ?? {},
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(schema.object.bucketId, params.bucketId),
                        eq(schema.object.key, params.key)
                    )
                );
        } else {
            // Insert new object
            await db.insert(schema.object).values({
                id: crypto.randomUUID(),
                bucketId: params.bucketId,
                key: params.key,
                size: params.size,
                etag: params.etag,
                contentType: params.contentType ?? 'application/octet-stream',
                metadata: params.metadata ?? {},
            });
        }
    }

    /**
     * Find an object by key
     */
    async findObjectByKey(bucketId: string, key: string): Promise<InferSelectModel<typeof schema.object> | null> {
        const db = this.databaseService.db;
        const objects = await db
            .select()
            .from(schema.object)
            .where(
                and(
                    eq(schema.object.bucketId, bucketId),
                    eq(schema.object.key, key)
                )
            )
            .limit(1);

        return objects[0] ?? null;
    }

    /**
     * Get object metadata
     */
    async getObjectMetadata(bucketId: string, key: string): Promise<ObjectInfo | null> {
        const obj = await this.findObjectByKey(bucketId, key);
        
        if (!obj) {
            return null;
        }

        return {
            name: obj.key,
            size: obj.size,
            etag: obj.etag,
            lastModified: obj.updatedAt,
            contentType: obj.contentType,
            metadata: obj.metadata ?? undefined,
        };
    }

    /**
     * Delete an object
     */
    async deleteObject(bucketId: string, key: string): Promise<void> {
        const db = this.databaseService.db;
        await db
            .delete(schema.object)
            .where(
                and(
                    eq(schema.object.bucketId, bucketId),
                    eq(schema.object.key, key)
                )
            );
    }

    /**
     * Delete all objects in a bucket
     */
    async deleteAllObjectsInBucket(bucketId: string): Promise<void> {
        const db = this.databaseService.db;
        await db.delete(schema.object).where(eq(schema.object.bucketId, bucketId));
    }
}
