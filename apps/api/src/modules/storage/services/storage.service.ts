import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { FilesystemUtils } from "../utils/filesystem.utils";
import { StorageRepository } from "../repositories/storage.repository";
import type {
    BucketInfo,
    ObjectInfo,
    ObjectListResult,
    PutObjectParams,
    GetObjectParams,
    ListObjectsParams,
    DeleteObjectParams,
    SignedUrlParams,
    CopyObjectParams,
    UploadResult,
} from "../types/storage.types";

/**
 * StorageService - Custom S3-compatible object storage implementation
 *
 * This service provides S3-compatible storage using:
 * - PostgreSQL for metadata (buckets, objects, multipart uploads)
 * - Filesystem for object data
 * - MD5 ETags for integrity verification
 * - Hybrid architecture matching S3 design
 */
@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);

    constructor(
        private readonly repository: StorageRepository,
        private readonly fs: FilesystemUtils,
    ) {}

    /**
     * Create a new bucket
     */
    async createBucket(bucketName: string, ownerId: string): Promise<void> {
        // Check if bucket already exists
        const existing = await this.repository.bucketExists(bucketName);

        if (existing) {
            throw new ConflictException(`Bucket already exists: ${bucketName}`);
        }

        // Create bucket record in database
        await this.repository.createBucket(bucketName, ownerId);

        // Create bucket directory on filesystem
        await this.fs.createBucketDirectory(bucketName);

        this.logger.log(`Bucket created: ${bucketName}`);
    }

    /**
     * Check if a bucket exists
     */
    async bucketExists(bucketName: string): Promise<boolean> {
        return this.repository.bucketExists(bucketName);
    }

    /**
     * List all buckets
     */
    async listBuckets(): Promise<BucketInfo[]> {
        return this.repository.listBuckets();
    }

    /**
     * Delete a bucket (must be empty)
     */
    async deleteBucket(bucketName: string): Promise<void> {
        // Check if bucket exists
        const bucket = await this.repository.findBucketByName(bucketName);

        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${bucketName}`);
        }

        // Check if bucket has objects
        const objectCount = await this.repository.countObjectsInBucket(bucket.id);

        if (objectCount > 0) {
            throw new BadRequestException(`Bucket is not empty: ${bucketName}`);
        }

        // Delete bucket directory on filesystem
        await this.fs.deleteBucketDirectory(bucketName);

        // Delete bucket record from database
        await this.repository.deleteBucket(bucketName);

        this.logger.log(`Bucket deleted: ${bucketName}`);
    }

    /**
     * Upload an object to a bucket
     */
    async putObject(params: PutObjectParams): Promise<UploadResult> {
        // Verify bucket exists
        const bucket = await this.repository.findBucketByName(params.bucket);

        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        // Calculate ETag (MD5 hash)
        const etag = this.fs.calculateETag(params.data);

        // Write object to filesystem
        await this.fs.writeObject(params.bucket, params.objectName, params.data);

        // Create or update object record in database
        await this.repository.upsertObject({
            bucketId: bucket.id,
            key: params.objectName,
            size: params.size,
            etag,
            contentType: params.contentType,
            metadata: params.metadata,
        });

        this.logger.debug(`Object uploaded: ${params.bucket}/${params.objectName}`);

        return {
            etag,
            versionId: undefined,
        };
    }

    /**
     * Get an object from a bucket (returns stream)
     */
    async getObject(params: GetObjectParams): Promise<NodeJS.ReadableStream> {
        // Verify object exists in database
        const bucket = await this.repository.findBucketByName(params.bucket);

        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        const obj = await this.repository.findObjectByKey(bucket.id, params.objectName);

        if (!obj) {
            throw new NotFoundException(`Object not found: ${params.bucket}/${params.objectName}`);
        }

        // Return read stream from filesystem
        this.logger.debug(`Object retrieved: ${params.bucket}/${params.objectName}`);
        return this.fs.createReadStream(params.bucket, params.objectName);
    }

    /**
     * Get object metadata without downloading the object
     */
    async statObject(bucket: string, objectName: string): Promise<ObjectInfo> {
        const bucketRecord = await this.repository.findBucketByName(bucket);

        if (!bucketRecord) {
            throw new NotFoundException(`Bucket not found: ${bucket}`);
        }

        const metadata = await this.repository.getObjectMetadata(bucketRecord.id, objectName);

        if (!metadata) {
            throw new NotFoundException(`Object not found: ${bucket}/${objectName}`);
        }

        return metadata;
    }

    /**
     * List objects in a bucket with pagination
     */
    async listObjects(params: ListObjectsParams): Promise<ObjectListResult> {
        const bucketRecord = await this.repository.findBucketByName(params.bucket);
      
        if (!bucketRecord) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        const maxKeys = params.maxKeys ?? 1000;
        const prefix = params.prefix ?? "";

        // Fetch from repository (repository handles pagination)
        const objects = await this.repository.listObjects(
            bucketRecord.id,
            prefix || undefined,
            maxKeys + 1 // Fetch one extra to check if truncated
        );

        const isTruncated = objects.length > maxKeys;
        const results = objects.slice(0, maxKeys);

        this.logger.debug(`Listed ${String(results.length)} objects in bucket: ${params.bucket}`);

        return {
            objects: results,
            prefixes: [], // TODO: Implement common prefix support
            isTruncated,
        };
    }

    /**
     * Delete an object from a bucket
     */
    async deleteObject(params: DeleteObjectParams): Promise<void> {
        const bucketRecord = await this.repository.findBucketByName(params.bucket);

        if (!bucketRecord) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        const obj = await this.repository.findObjectByKey(bucketRecord.id, params.objectName);

        if (!obj) {
            // S3 behavior: deleting non-existent object is not an error
            return;
        }

        // Delete from filesystem
        await this.fs.deleteObject(params.bucket, params.objectName);

        // Delete from database
        await this.repository.deleteObject(bucketRecord.id, params.objectName);

        this.logger.log(`Object deleted: ${params.bucket}/${params.objectName}`);
    }

    /**
     * Delete multiple objects from a bucket
     */
    async deleteObjects(bucket: string, objectNames: string[]): Promise<void> {
        const bucketRecord = await this.repository.findBucketByName(bucket);

        if (!bucketRecord) {
            throw new NotFoundException(`Bucket not found: ${bucket}`);
        }

        // Delete each object
        for (const objectName of objectNames) {
            await this.deleteObject({ bucket, objectName });
        }

        this.logger.log(`Deleted ${String(objectNames.length)} objects from bucket: ${bucket}`);
    }

    /**
     * Copy an object from one location to another
     */
    async copyObject(params: CopyObjectParams): Promise<void> {
        // Verify source bucket and object exist
        const sourceBucket = await this.repository.findBucketByName(params.sourceBucket);

        if (!sourceBucket) {
            throw new NotFoundException(`Source bucket not found: ${params.sourceBucket}`);
        }

        const sourceObj = await this.repository.findObjectByKey(sourceBucket.id, params.sourceObject);

        if (!sourceObj) {
            throw new NotFoundException(`Source object not found: ${params.sourceBucket}/${params.sourceObject}`);
        }

        // Verify destination bucket exists
        const destBucket = await this.repository.findBucketByName(params.destinationBucket);

        if (!destBucket) {
            throw new NotFoundException(`Destination bucket not found: ${params.destinationBucket}`);
        }

        // Copy file on filesystem
        await this.fs.copyObject(
            params.sourceBucket,
            params.sourceObject,
            params.destinationBucket,
            params.destinationObject,
        );

        // Create new object record in database
        await this.repository.upsertObject({
            bucketId: destBucket.id,
            key: params.destinationObject,
            size: sourceObj.size,
            etag: sourceObj.etag,
            contentType: sourceObj.contentType,
            metadata: sourceObj.metadata,
        });

        this.logger.log(
            `Object copied from ${params.sourceBucket}/${params.sourceObject} to ${params.destinationBucket}/${params.destinationObject}`,
        );
    }

    /**
     * Generate a presigned URL for GET operations (download)
     * TODO: Implement proper signed URL generation with JWT or similar
     */
    async getPresignedUrl(params: SignedUrlParams): Promise<string> {
        // Verify object exists
        await this.statObject(params.bucket, params.objectName);

        // For now, return a simple URL - in production, this should be a signed JWT
        // that the controller validates
        const token = Buffer.from(
            JSON.stringify({
                bucket: params.bucket,
                key: params.objectName,
                operation: "GET",
                expires: Date.now() + (params.expirySeconds ?? 3600) * 1000,
            }),
        ).toString("base64url");

        this.logger.debug(`Generated presigned GET URL for: ${params.bucket}/${params.objectName}`);
        return `/storage/presigned/${token}`;
    }

    /**
     * Generate a presigned URL for PUT operations (upload)
     * TODO: Implement proper signed URL generation with JWT or similar
     */
    async getPresignedPutUrl(params: SignedUrlParams): Promise<string> {
        // Verify bucket exists
        const exists = await this.bucketExists(params.bucket);
        if (!exists) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        // For now, return a simple URL - in production, this should be a signed JWT
        const token = Buffer.from(
            JSON.stringify({
                bucket: params.bucket,
                key: params.objectName,
                operation: "PUT",
                expires: Date.now() + (params.expirySeconds ?? 3600) * 1000,
            }),
        ).toString("base64url");

        this.logger.debug(`Generated presigned PUT URL for: ${params.bucket}/${params.objectName}`);
        return `/storage/presigned/${token}`;
    }

    /**
     * Upload an object from a File (direct upload through ORPC)
     */
    async uploadObject(params: {
        bucket: string;
        objectName: string;
        file: File;
    }): Promise<UploadResult> {
        // Verify bucket exists
        const bucket = await this.repository.findBucketByName(params.bucket);
        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        // Convert File to Buffer
        const arrayBuffer = await params.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Calculate ETag (MD5 hash)
        const etag = this.fs.calculateETag(buffer);

        // Write file to filesystem
        await this.fs.writeObject(params.bucket, params.objectName, buffer);

        // Create/update object metadata in database
        const contentType = params.file.type || "application/octet-stream";

        await this.repository.upsertObject({
            bucketId: bucket.id,
            key: params.objectName,
            size: buffer.length,
            etag,
            contentType,
        });

        this.logger.log(`Uploaded object: ${params.bucket}/${params.objectName} (${String(buffer.length)} bytes)`);

        return {
            etag,
        };
    }
}
