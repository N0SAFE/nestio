import { Controller, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { storageContract } from "@repo/api-contracts";
import { StorageService } from "../services/storage.service";
import { requireAuth } from "@/core/modules/auth/orpc/middlewares";

@Controller()
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Implement(storageContract.bucketList)
  bucketList() {
    return implement(storageContract.bucketList)
      .use(requireAuth())
      .handler(async () => {
        const buckets = await this.storageService.listBuckets();
        return {
          buckets: buckets.map((bucket) => ({
            name: bucket.name,
            creationDate: bucket.creationDate.toISOString(),
          })),
          total: buckets.length,
        };
      });
  }

  @Implement(storageContract.bucketCreate)
  bucketCreate() {
    return implement(storageContract.bucketCreate)
      .use(requireAuth())
      .handler(async ({ input }) => {
        await this.storageService.createBucket(input.name);
        // Get the bucket info after creation
        const buckets = await this.storageService.listBuckets();
        const bucket = buckets.find((b) => b.name === input.name);
        
        if (!bucket) {
          throw new Error('Bucket created but not found in list');
        }

        return {
          name: bucket.name,
          creationDate: bucket.creationDate.toISOString(),
        };
      });
  }

  @Implement(storageContract.bucketDelete)
  bucketDelete() {
    return implement(storageContract.bucketDelete)
      .use(requireAuth())
      .handler(async ({ input }) => {
        try {
          await this.storageService.deleteBucket(input.name);
          return {
            success: true,
            message: `Bucket ${input.name} deleted successfully`,
          };
        } catch (error) {
          this.logger.error(`Error deleting bucket ${input.name}`, error);
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete bucket',
          };
        }
      });
  }

  @Implement(storageContract.bucketExists)
  bucketExists() {
    return implement(storageContract.bucketExists)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const exists = await this.storageService.bucketExists(input.name);
        return {
          exists,
          name: input.name,
        };
      });
  }

  @Implement(storageContract.objectList)
  objectList() {
    return implement(storageContract.objectList)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const result = await this.storageService.listObjects({
          bucket: input.bucket,
          prefix: input.prefix,
          recursive: input.recursive,
          maxKeys: input.maxKeys,
          continuationToken: input.continuationToken,
        });

        return {
          objects: result.objects.map((obj) => ({
            name: obj.name,
            size: obj.size,
            etag: obj.etag,
            lastModified: obj.lastModified.toISOString(),
            contentType: obj.contentType,
            metadata: obj.metadata,
          })),
          prefixes: result.prefixes,
          isTruncated: result.isTruncated,
          nextContinuationToken: result.nextContinuationToken,
        };
      });
  }

  @Implement(storageContract.objectDelete)
  objectDelete() {
    return implement(storageContract.objectDelete)
      .use(requireAuth())
      .handler(async ({ input }) => {
        try {
          await this.storageService.deleteObject({
            bucket: input.bucket,
            objectName: input.objectName,
          });
          return {
            success: true,
            message: `Object ${input.objectName} deleted successfully`,
          };
        } catch (error) {
          this.logger.error(`Error deleting object ${input.bucket}/${input.objectName}`, error);
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete object',
          };
        }
      });
  }

  @Implement(storageContract.objectStat)
  objectStat() {
    return implement(storageContract.objectStat)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const stat = await this.storageService.statObject(input.bucket, input.objectName);
        return {
          name: stat.name,
          size: stat.size,
          etag: stat.etag,
          lastModified: stat.lastModified.toISOString(),
          contentType: stat.contentType,
          metadata: stat.metadata,
        };
      });
  }

  @Implement(storageContract.objectPresignedGetUrl)
  objectPresignedGetUrl() {
    return implement(storageContract.objectPresignedGetUrl)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const url = await this.storageService.getPresignedUrl({
          bucket: input.bucket,
          objectName: input.objectName,
          expirySeconds: input.expirySeconds,
        });

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (input.expirySeconds || 3600));

        return {
          url,
          expiresAt: expiresAt.toISOString(),
        };
      });
  }

  @Implement(storageContract.objectPresignedPutUrl)
  objectPresignedPutUrl() {
    return implement(storageContract.objectPresignedPutUrl)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const url = await this.storageService.getPresignedPutUrl({
          bucket: input.bucket,
          objectName: input.objectName,
          expirySeconds: input.expirySeconds,
        });

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (input.expirySeconds || 3600));

        return {
          url,
          expiresAt: expiresAt.toISOString(),
        };
      });
  }
}
