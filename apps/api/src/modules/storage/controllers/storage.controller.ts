import { Controller, Logger } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import { storageContract } from "@repo/api-contracts";
import { StorageService } from "../services/storage.service";
import { requireAuth } from "@/core/modules/auth/orpc/middlewares";

@Controller()
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Implement(storageContract.bucket.list)
  bucketList() {
    return implement(storageContract.bucket.list)
      .use(requireAuth())
      .handler(async () => {
        const buckets = await this.storageService.listBuckets();
        return {
          buckets: buckets.map((bucket) => ({
            name: bucket.name,
            creationDate: bucket.creationDate,
          })),
          total: buckets.length,
        };
      });
  }

  @Implement(storageContract.bucket.create)
  bucketCreate() {
    return implement(storageContract.bucket.create)
      .use(requireAuth())
      .handler(async ({ input, context }) => {
        // Pass user ID from auth context as bucket owner
        await this.storageService.createBucket(input.body.name, context.auth.user.id);
        // Get the bucket info after creation
        const buckets = await this.storageService.listBuckets();
        const bucket = buckets.find((b) => b.name === input.body.name);
        
        if (!bucket) {
          throw new Error('Bucket created but not found in list');
        }

        return {
          status: 201 as const,
          body: {
            name: bucket.name,
            creationDate: bucket.creationDate,
          },
        };
      });
  }

  @Implement(storageContract.bucket.delete)
  bucketDelete() {
    return implement(storageContract.bucket.delete)
      .use(requireAuth())
      .handler(async ({ input }) => {
        try {
          await this.storageService.deleteBucket(input.params.name);
          return {
            success: true,
            message: `Bucket ${input.params.name} deleted successfully`,
          };
        } catch (error) {
          this.logger.error(`Error deleting bucket ${input.params.name}`, error);
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to delete bucket',
          };
        }
      });
  }

  @Implement(storageContract.bucket.exists)
  bucketExists() {
    return implement(storageContract.bucket.exists)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const exists = await this.storageService.bucketExists(input.params.name);
        return {
          exists,
          name: input.params.name,
        };
      });
  }

  @Implement(storageContract.object.list)
  objectList() {
    return implement(storageContract.object.list)
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
            lastModified: obj.lastModified,
            contentType: obj.contentType,
            metadata: obj.metadata,
          })),
          prefixes: result.prefixes,
          isTruncated: result.isTruncated,
          nextContinuationToken: result.nextContinuationToken,
        };
      });
  }

  @Implement(storageContract.object.delete)
  objectDelete() {
    return implement(storageContract.object.delete)
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

  @Implement(storageContract.object.stat)
  objectStat() {
    return implement(storageContract.object.stat)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const stat = await this.storageService.statObject(input.bucket, input.objectName);
        return {
          name: stat.name,
          size: stat.size,
          etag: stat.etag,
          lastModified: stat.lastModified,
          contentType: stat.contentType,
          metadata: stat.metadata,
        };
      });
  }

  @Implement(storageContract.object.presignedGetUrl)
  objectPresignedGetUrl() {
    return implement(storageContract.object.presignedGetUrl)
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

  @Implement(storageContract.object.presignedPutUrl)
  objectPresignedPutUrl() {
    return implement(storageContract.object.presignedPutUrl)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const url = await this.storageService.getPresignedPutUrl({
          bucket: input.bucket,
          objectName: input.objectName,
          expirySeconds: input.expirySeconds,
        });

        const expiresAt = new Date();
    @Implement(storageContract.object.stat)
    objectStat() {
      return implement(storageContract.object.stat)
        .use(requireAuth())
        .handler(async ({ input }) => {
          const stat = await this.storageService.statObject(input.params.bucket, input.params.objectName);
          return {
            name: stat.name,
            size: stat.size,
            etag: stat.etag,
            lastModified: stat.lastModified,
            contentType: stat.contentType,
            metadata: stat.metadata,
          };
        });
    }

    @Implement(storageContract.object.presignedGetUrl)
    objectPresignedGetUrl() {
      return implement(storageContract.object.presignedGetUrl)
        .use(requireAuth())
        .handler(async ({ input }) => {
          const url = await this.storageService.getPresignedUrl({
            bucket: input.params.bucket,
            objectName: input.params.objectName,
            expirySeconds: input.query?.expirySeconds,
          });

          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + (input.query?.expirySeconds || 3600));

          return {
            url,
            expiresAt: expiresAt.toISOString(),
          };
        });
    }

    @Implement(storageContract.object.presignedPutUrl)
    objectPresignedPutUrl() {
      return implement(storageContract.object.presignedPutUrl)
        .use(requireAuth())
        .handler(async ({ input }) => {
          const url = await this.storageService.getPresignedPutUrl({
            bucket: input.params.bucket,
            objectName: input.params.objectName,
            expirySeconds: input.query?.expirySeconds,
          });

          const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (input.expirySeconds || 3600));

        return {
          url,
          expiresAt: expiresAt.toISOString(),
        };
      });
  }

  @Implement(storageContract.object.upload)
  objectUpload() {
    return implement(storageContract.object.upload)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const result = await this.storageService.uploadObject({
          bucket: input.bucket,
          objectName: input.objectName,
          file: input.file,
        });

        return {
          name: input.objectName,
          key: input.objectName,
          size: result.size,
          etag: result.etag,
          contentType: result.contentType,
        };
      });
  }

  // ==================== Presigned URL Handlers ====================

  @Implement(storageContract.presigned.download)
  presignedDownload() {
    return implement(storageContract.presigned.download)
      .handler(async ({ input }) => {
        const token = input.params.token;
        const range = input.headers?.range;
        
        const result = await this.storageService.handlePresignedDownload(token, range);
        
        const baseHeaders = {
          "content-type": result.contentType,
          "etag": result.etag,
          "accept-ranges": "bytes" as const,
          "content-length": String(result.contentLength),
          "content-disposition": `attachment; filename="${result.filename}"`,
        };
        
        if (result.statusCode === 206) {
          if (!result.contentRange) {
            throw new Error('Content-Range required for 206 status');
          }
          return {
            status: 206 as const,
            headers: {
              ...baseHeaders,
              "content-range": result.contentRange,
            },
            body: result.data,
          };
        }
        
        return {
          status: 200 as const,
          headers: baseHeaders,
          body: result.data,
        };
      });
  }

  @Implement(storageContract.presigned.upload)
  presignedUpload() {
    return implement(storageContract.presigned.upload)
      .handler(async ({ input }) => {
        const result = await this.storageService.handlePresignedUpload(
          input.token,
          input.file,
          input.contentType,
        );
        return result;
      });
  }

  // ==================== Multipart Upload Operations ====================

  @Implement(storageContract.multipart.initiate)
  multipartInitiate() {
    return implement(storageContract.multipart.initiate)
      .use(requireAuth())
      .handler(async ({ input }) => {
        return await this.storageService.initiateMultipartUpload({
          bucket: input.bucket,
          objectName: input.objectName,
          contentType: input.contentType,
          metadata: input.metadata,
        });
      });
  }

  @Implement(storageContract.multipart.uploadPart)
  multipartUploadPart() {
    return implement(storageContract.multipart.uploadPart)
      .use(requireAuth())
      .handler(async ({ input }) => {
        return await this.storageService.uploadMultipartPart({
          bucket: input.bucket,
          objectName: input.objectName,
          uploadId: input.uploadId,
          partNumber: input.partNumber,
          file: input.file,
        });
      });
  }

  @Implement(storageContract.multipart.complete)
  multipartComplete() {
    return implement(storageContract.multipart.complete)
      .use(requireAuth())
      .handler(async ({ input }) => {
        return await this.storageService.completeMultipartUpload({
          bucket: input.bucket,
          objectName: input.objectName,
          uploadId: input.uploadId,
          parts: input.parts,
        });
      });
  }

  @Implement(storageContract.multipart.abort)
  multipartAbort() {
    return implement(storageContract.multipart.abort)
      .use(requireAuth())
      .handler(async ({ input }) => {
        try {
          await this.storageService.abortMultipartUpload({
            bucket: input.bucket,
            objectName: input.objectName,
            uploadId: input.uploadId,
          });
          return {
            success: true,
            message: `Multipart upload ${input.uploadId} aborted successfully`,
          };
        } catch (error) {
          this.logger.error(`Error aborting multipart upload ${input.uploadId}`, error);
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to abort multipart upload',
          };
        }
      });
  }

  // ==================== New Enhanced Operations ====================

  @Implement(storageContract.object.head)
  objectHead() {
    return implement(storageContract.object.head)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const result = await this.storageService.headObject({
          bucket: input.params.bucket,
          objectName: input.params.objectName,
          ifMatch: input.headers?.['if-match'],
          ifNoneMatch: input.headers?.['if-none-match'],
          ifModifiedSince: input.headers?.['if-modified-since']
            ? new Date(input.headers['if-modified-since'])
            : undefined,
          ifUnmodifiedSince: input.headers?.['if-unmodified-since']
            ? new Date(input.headers['if-unmodified-since'])
            : undefined,
        });

        if (result.notModified) {
          return {
            status: 304 as const,
            headers: {
              "etag": result.etag,
              "last-modified": result.lastModified.toUTCString(),
            },
            body: null,
          };
        }

        return {
          status: 200 as const,
          headers: {
            "content-type": result.contentType,
            "content-length": String(result.size),
            "etag": result.etag,
            "last-modified": result.lastModified.toUTCString(),
            "accept-ranges": "bytes" as const,
          },
          body: null,
        };
      });
  }

  @Implement(storageContract.object.batchDelete)
  objectBatchDelete() {
    return implement(storageContract.object.batchDelete)
      .use(requireAuth())
      .handler(async ({ input }) => {
        return await this.storageService.batchDeleteObjects({
          bucket: input.bucket,
          objects: input.objects,
        });
      });
  }

  @Implement(storageContract.object.copy)
  objectCopy() {
    return implement(storageContract.object.copy)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const result = await this.storageService.copyObjectWithMetadata({
          sourceBucket: input.sourceBucket,
          sourceKey: input.sourceKey,
          destinationBucket: input.destinationBucket,
          destinationKey: input.destinationKey,
          metadataDirective: input.metadataDirective,
          contentType: input.contentType,
          metadata: input.metadata,
        });

        return {
          etag: result.etag,
          lastModified: result.lastModified.toISOString(),
          size: result.size,
        };
      });
  }

  @Implement(storageContract.multipart.listParts)
  multipartListParts() {
    return implement(storageContract.multipart.listParts)
      .use(requireAuth())
      .handler(async ({ input }) => {
        const result = await this.storageService.listMultipartParts({
          bucket: input.bucket,
          objectName: input.objectName,
          uploadId: input.uploadId,
        });

        return {
          parts: result.parts.map(part => ({
            partNumber: part.partNumber,
            etag: part.etag,
            size: part.size,
            uploadedAt: part.uploadedAt.toISOString(),
          })),
          bucket: result.bucket,
          key: result.key,
          uploadId: result.uploadId,
        };
      });
  }
}
