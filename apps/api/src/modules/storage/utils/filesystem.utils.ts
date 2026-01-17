import { Injectable, Logger } from "@nestjs/common";
import { promises as fs, createReadStream as fsCreateReadStream } from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { EnvService } from "@/config/env/env.service";

/**
 * FilesystemUtils - Handles file operations for object storage
 * 
 * Provides utilities for:
 * - Reading/writing objects to filesystem
 * - Calculating MD5 ETags
 * - Managing storage directories
 * - Ensuring S3-compatible file organization
 */
@Injectable()
export class FilesystemUtils {
    private readonly logger = new Logger(FilesystemUtils.name);
    private readonly storagePath: string;

    constructor(private readonly envService: EnvService) {
        this.storagePath = this.envService.get("STORAGE_ROOT_PATH");
    }

    /**
     * Get the full filesystem path for an object
     */
    getObjectPath(bucketName: string, objectKey: string): string {
        return path.join(this.storagePath, bucketName, objectKey);
    }

    /**
     * Get the bucket directory path
     */
    getBucketPath(bucketName: string): string {
        return path.join(this.storagePath, bucketName);
    }

    /**
     * Ensure a directory exists (creates if needed)
     */
    async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
                this.logger.error(`Failed to create directory: ${dirPath}`, error);
                throw error;
            }
        }
    }

    /**
     * Write an object to the filesystem
     */
    async writeObject(bucketName: string, objectKey: string, data: Buffer): Promise<void> {
        const objectPath = this.getObjectPath(bucketName, objectKey);
        const dirPath = path.dirname(objectPath);

        // Ensure directory exists
        await this.ensureDirectory(dirPath);

        // Write file
        await fs.writeFile(objectPath, data);
        this.logger.debug(`Object written: ${bucketName}/${objectKey}`);
    }

    /**
     * Read an object from the filesystem
     */
    async readObject(bucketName: string, objectKey: string): Promise<Buffer> {
        const objectPath = this.getObjectPath(bucketName, objectKey);
        try {
            return await fs.readFile(objectPath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw new Error(`Object not found: ${bucketName}/${objectKey}`);
            }
            this.logger.error(`Failed to read object: ${bucketName}/${objectKey}`, error);
            throw error;
        }
    }

    /**
     * Create a read stream for an object
     */
    createReadStream(bucketName: string, objectKey: string): NodeJS.ReadableStream {
        const objectPath = this.getObjectPath(bucketName, objectKey);
        return fsCreateReadStream(objectPath);
    }

    /**
     * Delete an object from the filesystem
     */
    async deleteObject(bucketName: string, objectKey: string): Promise<void> {
        const objectPath = this.getObjectPath(bucketName, objectKey);
        try {
            await fs.unlink(objectPath);
            this.logger.debug(`Object deleted: ${bucketName}/${objectKey}`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                // Object doesn't exist, consider it deleted
                return;
            }
            this.logger.error(`Failed to delete object: ${bucketName}/${objectKey}`, error);
            throw error;
        }
    }

    /**
     * Check if an object exists on the filesystem
     */
    async objectExists(bucketName: string, objectKey: string): Promise<boolean> {
        const objectPath = this.getObjectPath(bucketName, objectKey);
        try {
            await fs.access(objectPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get object file stats
     */
    async getObjectStats(bucketName: string, objectKey: string) {
        const objectPath = this.getObjectPath(bucketName, objectKey);
        return await fs.stat(objectPath);
    }

    /**
     * Calculate MD5 ETag for a buffer (S3-compatible)
     */
    calculateETag(data: Buffer): string {
        return createHash("md5").update(data).digest("hex");
    }

    /**
     * Calculate MD5 ETag for a file (S3-compatible)
     */
    async calculateFileETag(bucketName: string, objectKey: string): Promise<string> {
        const data = await this.readObject(bucketName, objectKey);
        return this.calculateETag(data);
    }

    /**
     * Create bucket directory
     */
    async createBucketDirectory(bucketName: string): Promise<void> {
        const bucketPath = this.getBucketPath(bucketName);
        await this.ensureDirectory(bucketPath);
        this.logger.log(`Bucket directory created: ${bucketName}`);
    }

    /**
     * Delete bucket directory (must be empty)
     */
    async deleteBucketDirectory(bucketName: string): Promise<void> {
        const bucketPath = this.getBucketPath(bucketName);
        try {
            await fs.rmdir(bucketPath);
            this.logger.log(`Bucket directory deleted: ${bucketName}`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOTEMPTY") {
                throw new Error(`Bucket is not empty: ${bucketName}`);
            }
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                // Directory doesn't exist, consider it deleted
                return;
            }
            this.logger.error(`Failed to delete bucket directory: ${bucketName}`, error);
            throw error;
        }
    }

    /**
     * List objects in a bucket directory (recursive)
     */
    async listObjectsInDirectory(
        bucketName: string,
        prefix = "",
        recursive = true,
    ): Promise<string[]> {
        const bucketPath = this.getBucketPath(bucketName);
        const searchPath = prefix ? path.join(bucketPath, prefix) : bucketPath;
        const objects: string[] = [];

        try {
            const entries = await fs.readdir(searchPath, { withFileTypes: true });

            for (const entry of entries) {
                const relativePath = prefix ? path.join(prefix, entry.name) : entry.name;

                if (entry.isDirectory()) {
                    if (recursive) {
                        const subObjects = await this.listObjectsInDirectory(bucketName, relativePath, recursive);
                        objects.push(...subObjects);
                    }
                } else if (entry.isFile()) {
                    objects.push(relativePath);
                }
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                // Directory doesn't exist, return empty array
                return [];
            }
            throw error;
        }

        return objects;
    }

    /**
     * Copy an object within or between buckets
     */
    async copyObject(
        sourceBucket: string,
        sourceKey: string,
        destBucket: string,
        destKey: string,
    ): Promise<void> {
        const sourcePath = this.getObjectPath(sourceBucket, sourceKey);
        const destPath = this.getObjectPath(destBucket, destKey);
        const destDir = path.dirname(destPath);

        // Ensure destination directory exists
        await this.ensureDirectory(destDir);

        // Copy file
        await fs.copyFile(sourcePath, destPath);
        this.logger.debug(`Object copied from ${sourceBucket}/${sourceKey} to ${destBucket}/${destKey}`);
    }
}
