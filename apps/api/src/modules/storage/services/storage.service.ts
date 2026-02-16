import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { lookup as mimeTypeLookup } from "mime-types";
import { FilesystemUtils } from "../utils/filesystem.utils";
import { StorageRepository } from "../repositories/storage.repository";
import { RangeParserService } from "./range-parser.service";
import { EnvService } from "@/config/env/env.service";
import type {
    BucketInfo,
    ObjectInfo,
    ObjectListResult,
    PutObjectParams,
    GetObjectParams,
    GetObjectResult,
    ListObjectsParams,
    DeleteObjectParams,
    SignedUrlParams,
    CopyObjectParams,
    UploadResult,
    PresignedTokenPayload,
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
    private readonly maxFileSize: number;

    constructor(
        private readonly repository: StorageRepository,
        private readonly fs: FilesystemUtils,
        private readonly rangeParser: RangeParserService,
        private readonly envService: EnvService,
    ) {
        this.maxFileSize = this.envService.get("STORAGE_MAX_FILE_SIZE");
    }

    // ==================== Content Type Detection ====================

    /**
     * Detect content type from filename using mime-types package
     */
    private detectContentType(filename: string): string {
        return mimeTypeLookup(filename) || "application/octet-stream";
    }

    // ==================== Presigned URL Security ====================

    /**
     * Generate a signed JWT presigned URL token
     */
    private generateSignedToken(payload: PresignedTokenPayload): string {
        const secretKey = this.envService.get("STORAGE_SECRET_KEY");
        
        // Calculate expiry in seconds from now
        const expiresInSeconds = Math.floor((payload.expires - Date.now()) / 1000);
        
        return jwt.sign(
            {
                bucket: payload.bucket,
                key: payload.key,
                operation: payload.operation,
                contentType: payload.contentType,
                maxSize: payload.maxSize,
            },
            secretKey,
            {
                expiresIn: expiresInSeconds,
                algorithm: "HS256",
                issuer: "nestio-storage",
            },
        );
    }

    /**
     * Verify and decode a presigned URL JWT token
     * Returns null if invalid or expired
     */
    verifyPresignedToken(token: string): PresignedTokenPayload | null {
        try {
            const secretKey = this.envService.get("STORAGE_SECRET_KEY");
            
            const decoded = jwt.verify(token, secretKey, {
                algorithms: ["HS256"],
                issuer: "nestio-storage",
            }) as jwt.JwtPayload & {
                bucket: string;
                key: string;
                operation: "GET" | "PUT";
                contentType?: string;
                maxSize?: number;
            };

            // JWT handles expiry check automatically, if we're here it's valid
            // Convert JWT exp back to milliseconds timestamp
            const expires = decoded.exp ? decoded.exp * 1000 : Date.now() + 3600000;

            return {
                bucket: decoded.bucket,
                key: decoded.key,
                operation: decoded.operation,
                expires,
                contentType: decoded.contentType,
                maxSize: decoded.maxSize,
            };
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                this.logger.warn("Presigned token has expired");
            } else if (error instanceof jwt.JsonWebTokenError) {
                this.logger.warn("Invalid presigned token", error.message);
            } else {
                this.logger.error("Error verifying presigned token", error);
            }
            return null;
        }
    }

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

        // Determine the actual size from params or buffer length  
         
        const objectSize: number = params.size ?? params.data.length;

        // Write object to filesystem
        await this.fs.writeObject(params.bucket, params.objectName, params.data);

        // Create or update object record in database
        await this.repository.upsertObject({
            bucketId: bucket.id,
            key: params.objectName,
            size: objectSize,
            etag,
            contentType: params.contentType,
            metadata: params.metadata,
        });

        this.logger.debug(`Object uploaded: ${params.bucket}/${params.objectName}`);

        return {
            etag,
            size: objectSize,
            contentType: params.contentType ?? 'application/octet-stream',
            versionId: undefined,
        };
    }

    /**
     * Get an object from a bucket with optional range support (RFC 7233)
     * Supports:
     * - Full downloads (200 OK)
     * - Partial content (206 Partial Content)
     * - Range requests (bytes=0-1023, bytes=1024-, bytes=-500)
     */
    async getObject(params: GetObjectParams): Promise<GetObjectResult> {
        // Verify object exists in database
        const bucket = await this.repository.findBucketByName(params.bucket);

        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        const obj = await this.repository.findObjectByKey(bucket.id, params.objectName);

        if (!obj) {
            throw new NotFoundException(`Object not found: ${params.bucket}/${params.objectName}`);
        }

        // Parse range header if provided
        const rangeResult = this.rangeParser.parseRange(params.range, obj.size);

        let data: Buffer;
        let statusCode: 200 | 206;
        let contentRange: string | undefined;
        let contentLength: number;

        if (rangeResult) {
            // Partial content (206)
            statusCode = 206;
            data = await this.fs.readObjectRange(
                params.bucket,
                params.objectName,
                rangeResult.start,
                rangeResult.end
            );
            contentRange = this.rangeParser.formatContentRange(rangeResult);
            contentLength = rangeResult.contentLength;

            this.logger.debug(
                `Range request: ${params.bucket}/${params.objectName} ` +
                `(${String(rangeResult.start)}-${String(rangeResult.end)}/${String(obj.size)})`
            );
        } else {
            // Full content (200)
            statusCode = 200;
            data = await this.fs.readObject(params.bucket, params.objectName);
            contentLength = obj.size;

            this.logger.debug(`Full object retrieved: ${params.bucket}/${params.objectName}`);
        }

        return {
            data,
            contentType: obj.contentType,
            size: obj.size,
            etag: obj.etag,
            statusCode,
            contentRange,
            acceptRanges: "bytes",
            contentLength,
        };
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
            metadata: sourceObj.metadata ?? undefined,
        });

        this.logger.log(
            `Object copied from ${params.sourceBucket}/${params.sourceObject} to ${params.destinationBucket}/${params.destinationObject}`,
        );
    }

    /**
     * Generate a presigned URL for GET operations (download)
     * Uses HMAC-SHA256 for cryptographic signing
     */
    async getPresignedUrl(params: SignedUrlParams): Promise<string> {
        // Verify object exists
        const stat = await this.statObject(params.bucket, params.objectName);

        const payload: PresignedTokenPayload = {
            bucket: params.bucket,
            key: params.objectName,
            operation: "GET",
            expires: Date.now() + (params.expirySeconds ?? 3600) * 1000,
            contentType: stat.contentType,
        };

        const token = this.generateSignedToken(payload);

        this.logger.debug(`Generated presigned GET URL for: ${params.bucket}/${params.objectName}`);
        return `/storage/presigned/${token}`;
    }

    /**
     * Generate a presigned URL for PUT operations (upload)
     * Uses HMAC-SHA256 for cryptographic signing
     */
    async getPresignedPutUrl(params: SignedUrlParams): Promise<string> {
        // Verify bucket exists
        const exists = await this.bucketExists(params.bucket);
        if (!exists) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        const payload: PresignedTokenPayload = {
            bucket: params.bucket,
            key: params.objectName,
            operation: "PUT",
            expires: Date.now() + (params.expirySeconds ?? 3600) * 1000,
            maxSize: this.maxFileSize,
        };

        const token = this.generateSignedToken(payload);

        this.logger.debug(`Generated presigned PUT URL for: ${params.bucket}/${params.objectName}`);
        return `/storage/presigned/${token}`;
    }

    /**
     * Handle presigned GET request (download)
     * Supports range requests for partial content
     * Returns data ready for HTTP response with proper headers
     */
    async handlePresignedDownload(token: string, range?: string): Promise<{
        data: Buffer;
        contentType: string;
        etag: string;
        filename: string;
        statusCode: 200 | 206;
        contentRange?: string;
        contentLength: number;
    }> {
        const payload = this.verifyPresignedToken(token);

        if (!payload) {
            throw new ForbiddenException("Invalid or expired presigned URL");
        }

        if (payload.operation !== "GET") {
            throw new BadRequestException("Invalid operation for download");
        }

        // Get object with range support
        const result = await this.getObject({
            bucket: payload.bucket,
            objectName: payload.key,
            range,
        });

        return {
            data: result.data,
            contentType: result.contentType,
            etag: result.etag,
            filename: payload.key.split("/").pop() ?? payload.key,
            statusCode: result.statusCode,
            contentRange: result.contentRange,
            contentLength: result.contentLength,
        };
    }

    /**
     * Handle presigned PUT request (upload)
     * Verifies token and saves file
     */
    async handlePresignedUpload(token: string, file: File, contentType?: string): Promise<UploadResult> {
        const payload = this.verifyPresignedToken(token);

        if (!payload) {
            throw new ForbiddenException("Invalid or expired presigned URL");
        }

        if (payload.operation !== "PUT") {
            throw new BadRequestException("Invalid operation for upload");
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check file size limit
        if (payload.maxSize && buffer.length > payload.maxSize) {
            throw new BadRequestException(
                `File size ${String(buffer.length)} exceeds maximum allowed size ${String(payload.maxSize)}`,
            );
        }

        // Upload the object
        return this.putObject({
            bucket: payload.bucket,
            objectName: payload.key,
            data: buffer,
            contentType: contentType ?? payload.contentType ?? "application/octet-stream",
        });
    }

    /**
     * Upload an object from a File (direct upload through ORPC)
     */
    async uploadObject(params: {
        bucket: string;
        objectName: string;
        file: File;
    }): Promise<UploadResult> {
        // Validate file size before processing
        if (params.file.size > this.maxFileSize) {
            const fileSizeStr = String(params.file.size);
            const maxSizeStr = String(this.maxFileSize);
            const maxSizeMB = String(Math.round(this.maxFileSize / 1024 / 1024));
            throw new BadRequestException(
                `File size ${fileSizeStr} exceeds maximum allowed size ${maxSizeStr} (${maxSizeMB}MB)`,
            );
        }

        // Verify bucket exists
        const bucket = await this.repository.findBucketByName(params.bucket);
        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        // Convert File to Buffer
        const arrayBuffer = await params.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Calculate ETag (MD5 hash) - buffer is guaranteed to be Buffer type here
        const etag = this.fs.calculateETag(buffer);

        // Write file to filesystem
        await this.fs.writeObject(params.bucket, params.objectName, buffer);

        // Detect content type - use file type, fallback to mime lookup, then default
        const contentType = params.file.type || this.detectContentType(params.objectName);

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
            size: buffer.length,
            contentType,
        };
    }

    // ==================== Multipart Upload Operations ====================

    /**
     * Initiate a multipart upload session
     */
    async initiateMultipartUpload(params: {
        bucket: string;
        objectName: string;
        contentType?: string;
        metadata?: Record<string, string>;
    }): Promise<{ uploadId: string; bucket: string; key: string }> {
        // Verify bucket exists
        const bucket = await this.repository.findBucketByName(params.bucket);
        if (!bucket) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        // Generate unique upload ID
        const uploadId = crypto.randomUUID();

        // Create multipart upload record
        await this.repository.createMultipartUpload({
            bucketId: bucket.id,
            key: params.objectName,
            uploadId,
            contentType: params.contentType,
            metadata: params.metadata,
        });

        // Create temp directory for parts
        await this.fs.createDirectory(params.bucket, `_multipart/${uploadId}`);

        this.logger.log(`Initiated multipart upload: ${params.bucket}/${params.objectName} (uploadId: ${uploadId})`);

        return {
            uploadId,
            bucket: params.bucket,
            key: params.objectName,
        };
    }

    /**
     * Upload a part in a multipart upload
     */
    async uploadMultipartPart(params: {
        bucket: string;
        objectName: string;
        uploadId: string;
        partNumber: number;
        file: File;
    }): Promise<{ etag: string; partNumber: number }> {
        // Verify multipart upload exists
        const upload = await this.repository.findMultipartUpload(params.uploadId);
        if (!upload) {
            throw new NotFoundException(`Multipart upload not found: ${params.uploadId}`);
        }

        // Verify bucket and key match
        const bucket = await this.repository.findBucketByName(params.bucket);
        if (bucket?.id !== upload.bucketId || upload.key !== params.objectName) {
            throw new BadRequestException("Bucket or key mismatch");
        }

        // Convert File to Buffer
        const arrayBuffer = await params.file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Calculate ETag for this part
        const etag = this.fs.calculateETag(buffer);

        // Write part to temporary location
        const partPath = `_multipart/${params.uploadId}/part-${String(params.partNumber)}`;
        await this.fs.writeObject(params.bucket, partPath, buffer);

        // Record part metadata
        await this.repository.addMultipartPart({
            uploadId: params.uploadId,
            partNumber: params.partNumber,
            size: buffer.length,
            etag,
        });

        this.logger.log(`Uploaded part ${String(params.partNumber)} for ${params.uploadId} (${String(buffer.length)} bytes)`);

        return {
            etag,
            partNumber: params.partNumber,
        };
    }

    /**
     * Complete a multipart upload by assembling all parts
     */
    async completeMultipartUpload(params: {
        bucket: string;
        objectName: string;
        uploadId: string;
        parts: { partNumber: number; etag: string }[];
    }): Promise<{ etag: string; size: number; key: string }> {
        // Verify multipart upload exists
        const upload = await this.repository.findMultipartUpload(params.uploadId);
        if (!upload) {
            throw new NotFoundException(`Multipart upload not found: ${params.uploadId}`);
        }

        // Verify bucket and key match
        const bucket = await this.repository.findBucketByName(params.bucket);
        if (bucket?.id !== upload.bucketId || upload.key !== params.objectName) {
            throw new BadRequestException("Bucket or key mismatch");
        }

        // Get all stored parts from database
        const storedParts = await this.repository.getMultipartParts(params.uploadId);

        // Verify all parts are present and ETags match
        if (storedParts.length !== params.parts.length) {
            throw new BadRequestException(
                `Part count mismatch: expected ${String(storedParts.length)}, got ${String(params.parts.length)}`,
            );
        }

        // Sort parts by part number
        const sortedParts = [...params.parts].sort((a, b) => a.partNumber - b.partNumber);

        // Verify ETags
        for (const providedPart of sortedParts) {
            const storedPart = storedParts.find(p => p.partNumber === providedPart.partNumber);

            if (!storedPart) {
                throw new BadRequestException(`Part ${String(providedPart.partNumber)} not found`);
            }

            if (storedPart.etag !== providedPart.etag) {
                throw new BadRequestException(`ETag mismatch for part ${String(providedPart.partNumber)}`);
            }
        }

        // Assemble parts into final object
        const partBuffers: Buffer[] = [];
        let totalSize = 0;

        for (const part of storedParts) {
            const partPath = `_multipart/${params.uploadId}/part-${String(part.partNumber)}`;
            const partData = await this.fs.readObject(params.bucket, partPath);
            partBuffers.push(partData);
            totalSize += part.size;
        }

        // Concatenate all parts
        const finalBuffer = Buffer.concat(partBuffers);

        // Calculate final ETag (MD5 of concatenated data)
        const finalETag = this.fs.calculateETag(finalBuffer);

        // Write final object
        await this.fs.writeObject(params.bucket, params.objectName, finalBuffer);

        // Create object metadata
        const contentType = upload.contentType ?? this.detectContentType(params.objectName);
        await this.repository.upsertObject({
            bucketId: bucket.id,
            key: params.objectName,
            size: totalSize,
            etag: finalETag,
            contentType,
        });

        // Cleanup: delete multipart upload and temp files
        await this.abortMultipartUpload({
            bucket: params.bucket,
            objectName: params.objectName,
            uploadId: params.uploadId,
        });

        this.logger.log(`Completed multipart upload: ${params.bucket}/${params.objectName} (${String(totalSize)} bytes)`);

        return {
            etag: finalETag,
            size: totalSize,
            key: params.objectName,
        };
    }

    /**
     * Abort a multipart upload and cleanup
     */
    async abortMultipartUpload(params: {
        bucket: string;
        objectName: string;
        uploadId: string;
    }): Promise<void> {
        // Verify multipart upload exists
        const upload = await this.repository.findMultipartUpload(params.uploadId);
        if (!upload) {
            throw new NotFoundException(`Multipart upload not found: ${params.uploadId}`);
        }

        // Delete temp directory with all parts
        try {
            await this.fs.deleteObject(params.bucket, `_multipart/${params.uploadId}`);
        } catch (error) {
            this.logger.warn(`Failed to cleanup multipart temp directory: ${params.uploadId}`, error);
        }

        // Delete multipart upload record (cascade will delete parts)
        await this.repository.deleteMultipartUpload(params.uploadId);

        this.logger.log(`Aborted multipart upload: ${params.uploadId}`);
    }

    /**
     * Get object metadata with conditional request support
     * Returns 304 Not Modified if ETag matches If-None-Match header
     */
    async headObject(params: {
        bucket: string;
        objectName: string;
        ifMatch?: string;
        ifNoneMatch?: string;
        ifModifiedSince?: Date;
        ifUnmodifiedSince?: Date;
    }): Promise<{
        contentType: string;
        size: number;
        etag: string;
        lastModified: Date;
        notModified?: boolean;
    }> {
        const obj = await this.statObject(params.bucket, params.objectName);

        // Check If-None-Match (ETag validation for cache)
        if (params.ifNoneMatch) {
            const etags = params.ifNoneMatch.split(',').map(e => e.trim());
            if (etags.includes(obj.etag) || etags.includes('*')) {
                return {
                    contentType: obj.contentType ?? "application/octet-stream",
                    size: obj.size,
                    etag: obj.etag,
                    lastModified: obj.lastModified,
                    notModified: true,
                };
            }
        }

        // Check If-Match (ETag validation for precondition)
        if (params.ifMatch) {
            const etags = params.ifMatch.split(',').map(e => e.trim());
            if (!etags.includes(obj.etag) && !etags.includes('*')) {
                throw new BadRequestException('Precondition failed: ETag does not match');
            }
        }

        // Check If-Modified-Since
        if (params.ifModifiedSince && obj.lastModified <= params.ifModifiedSince) {
            return {
                contentType: obj.contentType ?? "application/octet-stream",
                size: obj.size,
                etag: obj.etag,
                lastModified: obj.lastModified,
                notModified: true,
            };
        }

        // Check If-Unmodified-Since
        if (params.ifUnmodifiedSince && obj.lastModified > params.ifUnmodifiedSince) {
            throw new BadRequestException('Precondition failed: Object was modified');
        }

        return {
            contentType: obj.contentType ?? "application/octet-stream",
            size: obj.size,
            etag: obj.etag,
            lastModified: obj.lastModified,
            notModified: false,
        };
    }

    /**
     * Delete multiple objects in a single operation
     * Returns deleted items and errors
     */
    async batchDeleteObjects(params: {
        bucket: string;
        objects: string[];
    }): Promise<{
        deleted: { key: string }[];
        errors?: { key: string; code: string; message: string }[];
    }> {
        const bucketRecord = await this.repository.findBucketByName(params.bucket);

        if (!bucketRecord) {
            throw new NotFoundException(`Bucket not found: ${params.bucket}`);
        }

        const deleted: { key: string }[] = [];
        const errors: { key: string; code: string; message: string }[] = [];

        // Process each deletion
        for (const objectName of params.objects) {
            try {
                await this.deleteObject({ bucket: params.bucket, objectName });
                deleted.push({ key: objectName });
            } catch (error) {
                errors.push({
                    key: objectName,
                    code: error instanceof NotFoundException ? 'NoSuchKey' : 'InternalError',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        this.logger.log(`Batch deleted ${String(deleted.length)} objects from bucket: ${params.bucket}`);

        return {
            deleted,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    /**
     * Copy object with metadata handling
     */
    async copyObjectWithMetadata(params: {
        sourceBucket: string;
        sourceKey: string;
        destinationBucket: string;
        destinationKey: string;
        metadataDirective?: 'COPY' | 'REPLACE';
        contentType?: string;
        metadata?: Record<string, string>;
    }): Promise<{
        etag: string;
        lastModified: Date;
        size: number;
    }> {
        // Get source object
        const sourceBucketRecord = await this.repository.findBucketByName(params.sourceBucket);
        if (!sourceBucketRecord) {
            throw new NotFoundException(`Source bucket not found: ${params.sourceBucket}`);
        }

        const sourceObj = await this.repository.findObjectByKey(sourceBucketRecord.id, params.sourceKey);
        if (!sourceObj) {
            throw new NotFoundException(`Source object not found: ${params.sourceBucket}/${params.sourceKey}`);
        }

        // Get destination bucket
        const destBucketRecord = await this.repository.findBucketByName(params.destinationBucket);
        if (!destBucketRecord) {
            throw new NotFoundException(`Destination bucket not found: ${params.destinationBucket}`);
        }

        // Copy file on filesystem
        await this.fs.copyObject(
            params.sourceBucket,
            params.sourceKey,
            params.destinationBucket,
            params.destinationKey,
        );

        // Determine metadata based on directive
        const contentType = params.metadataDirective === 'REPLACE' && params.contentType
            ? params.contentType
            : sourceObj.contentType;

        const metadata = params.metadataDirective === 'REPLACE' && params.metadata
            ? params.metadata
            : sourceObj.metadata;

        // Create new object record
        const newObj = await this.repository.createObject({
            bucketId: destBucketRecord.id,
            key: params.destinationKey,
            size: sourceObj.size,
            etag: sourceObj.etag,
            contentType,
            metadata,
        });

        this.logger.log(`Copied object: ${params.sourceBucket}/${params.sourceKey} → ${params.destinationBucket}/${params.destinationKey}`);

        return {
            etag: newObj.etag,
            lastModified: newObj.createdAt,
            size: newObj.size,
        };
    }

    /**
     * List parts uploaded for a multipart upload
     */
    async listMultipartParts(params: {
        bucket: string;
        objectName: string;
        uploadId: string;
    }): Promise<{
        parts: {
            partNumber: number;
            etag: string;
            size: number;
            uploadedAt: Date;
        }[];
        bucket: string;
        key: string;
        uploadId: string;
    }> {
        // Verify multipart upload exists
        const upload = await this.repository.findMultipartUpload(params.uploadId);
        if (!upload) {
            throw new NotFoundException(`Multipart upload not found: ${params.uploadId}`);
        }

        // Verify bucket and key match
        const bucket = await this.repository.findBucketByName(params.bucket);
        if (bucket?.id !== upload.bucketId || upload.key !== params.objectName) {
            throw new BadRequestException("Bucket or key mismatch");
        }

        // Get all parts
        const parts = await this.repository.getMultipartParts(params.uploadId);

        return {
            parts: parts.map(part => ({
                partNumber: part.partNumber,
                etag: part.etag,
                size: part.size,
                uploadedAt: part.uploadedAt,
            })),
            bucket: params.bucket,
            key: params.objectName,
            uploadId: params.uploadId,
        };
    }
}
