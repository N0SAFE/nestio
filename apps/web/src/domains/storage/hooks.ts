/**
 * Storage Domain - Client Hooks
 *
 * React hooks for storage management with automatic cache invalidation.
 * Provides S3-compatible bucket and object operations.
 */

"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { storageEndpoints } from "./endpoints";
import { storageInvalidations } from "./invalidations";
import { wrapWithInvalidations } from "../shared/helpers";
import { toast } from "sonner";

// Wrap endpoints with automatic invalidation
const enhancedStorage = wrapWithInvalidations(storageEndpoints, storageInvalidations);

// ============================================================================
// BUCKET QUERY HOOKS (Read Operations)
// ============================================================================

/**
 * List all buckets
 * 
 * @example
 * const { data: buckets, isLoading } = useBuckets()
 */
export function useBuckets() {
  return useQuery(storageEndpoints.bucketList.queryOptions({ input: {} }));
}

/**
 * Check if a bucket exists
 * 
 * @example
 * const { data: exists } = useBucketExists('my-bucket')
 */
export function useBucketExists(bucketName: string, options?: { enabled?: boolean }) {
  return useQuery(
    storageEndpoints.bucketExists.queryOptions({ 
      input: { name: bucketName },
      enabled: options?.enabled ?? !!bucketName,
    }),
  );
}

// ============================================================================
// OBJECT QUERY HOOKS (Read Operations)
// ============================================================================

/**
 * List objects in a bucket with optional prefix filtering
 * 
 * @example
 * const { data: objects } = useObjects('my-bucket', 'photos/')
 */
export function useObjects(
  bucket: string, 
  prefix?: string,
  options?: { enabled?: boolean; maxKeys?: number }
) {
  return useQuery(
    storageEndpoints.objectList.queryOptions({
      input: {
        bucket,
        prefix: prefix ?? '',
        maxKeys: options?.maxKeys ?? 1000,
      },
      enabled: options?.enabled ?? !!bucket,
    }),
  );
}

/**
 * Get object metadata (stat)
 * 
 * @example
 * const { data: metadata } = useObjectStat('my-bucket', 'file.txt')
 */
export function useObjectStat(
  bucket: string, 
  objectName: string,
  options?: { enabled?: boolean }
) {
  return useQuery(
    storageEndpoints.objectStat.queryOptions({
      input: { bucket, objectName },
      enabled: options?.enabled ?? (!!bucket && !!objectName),
    }),
  );
}

// ============================================================================
// BUCKET MUTATION HOOKS (Write Operations)
// ============================================================================

/**
 * Create bucket mutation
 * Invalidates bucket list after creation
 * 
 * @example
 * const createBucket = useCreateBucket()
 * await createBucket.mutateAsync('my-new-bucket')
 */
export function useCreateBucket() {
  return useMutation(
    storageEndpoints.bucketCreate.mutationOptions({
      onSuccess: enhancedStorage.bucketCreate.withInvalidationOnSuccess((data, variables) => {
        toast.success(`Bucket "${variables.name}" created successfully`);
      }),
      onError: (error: Error) => {
        toast.error(`Failed to create bucket: ${error.message}`);
      },
    }),
  );
}

/**
 * Delete bucket mutation
 * Bucket must be empty before deletion
 * Invalidates bucket list and existence check
 * 
 * @example
 * const deleteBucket = useDeleteBucket()
 * await deleteBucket.mutateAsync('my-bucket')
 */
export function useDeleteBucket() {
  return useMutation(
    storageEndpoints.bucketDelete.mutationOptions({
      onSuccess: enhancedStorage.bucketDelete.withInvalidationOnSuccess((data, variables) => {
        toast.success(`Bucket "${variables.name}" deleted successfully`);
      }),
      onError: (error: Error) => {
        toast.error(`Failed to delete bucket: ${error.message}`);
      },
    }),
  );
}

// ============================================================================
// OBJECT MUTATION HOOKS (Write Operations)
// ============================================================================

/**
 * Upload file mutation with progress tracking
 * Invalidates object list for the bucket
 * 
 * Uses ORPC's built-in XHR upload with progress callbacks
 * The FileUploadOpenAPILink automatically detects File inputs
 * and uses XMLHttpRequest with progress events
 * 
 * @example
 * const upload = useFileUpload()
 * await upload.mutateAsync({ 
 *   bucket: 'my-bucket', 
 *   file: myFile,
 *   onProgress: ({ percent }) => console.log(`${percent}% uploaded`)
 * })
 */
export function useFileUpload() {
  return useMutation(
    storageEndpoints.objectUpload.mutationOptions({
      onSuccess: enhancedStorage.objectUpload.withInvalidationOnSuccess((data, variables) => {
        toast.success(`File "${variables.file.name}" uploaded successfully`);
      }),
      onError: (error: Error, variables) => {
        toast.error(`Failed to upload "${variables.file.name}": ${error.message}`);
      },
    }),
  );
}

/**
 * Delete object mutation
 * Invalidates object list and stat for this object
 * 
 * @example
 * const deleteObject = useDeleteObject()
 * await deleteObject.mutateAsync({ bucket: 'my-bucket', objectName: 'file.txt' })
 */
export function useDeleteObject() {
  return useMutation(
    storageEndpoints.objectDelete.mutationOptions({
      onSuccess: enhancedStorage.objectDelete.withInvalidationOnSuccess((data, variables) => {
        toast.success(`Object "${variables.objectName}" deleted successfully`);
      }),
      onError: (error: Error) => {
        toast.error(`Failed to delete object: ${error.message}`);
      },
    }),
  );
}

/**
 * Generate presigned GET URL for secure download
 * Does not invalidate cache (read-only operation)
 * 
 * @example
 * const getUrl = usePresignedGetUrl()
 * const { url } = await getUrl.mutateAsync({ bucket: 'my-bucket', objectName: 'file.txt' })
 * window.open(url)
 */
export function usePresignedGetUrl() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof storageEndpoints.objectPresignedGetUrl.call>[0]) => {
      return await storageEndpoints.objectPresignedGetUrl.call(input);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate download URL: ${error.message}`);
    },
  });
}

/**
 * Generate presigned PUT URL for secure upload
 * Does not invalidate cache (returns URL for external upload)
 * 
 * Note: This is for advanced use cases. For direct file uploads,
 * use useFileUpload() instead which handles everything automatically.
 * 
 * @example
 * const getPutUrl = usePresignedPutUrl()
 * const { url } = await getPutUrl.mutateAsync({ bucket: 'my-bucket', objectName: 'file.txt' })
 * await fetch(url, { method: 'PUT', body: fileData })
 */
export function usePresignedPutUrl() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof storageEndpoints.objectPresignedPutUrl.call>[0]) => {
      return await storageEndpoints.objectPresignedPutUrl.call(input);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate upload URL: ${error.message}`);
    },
  });
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Get all bucket mutations in one hook
 * 
 * @example
 * const buckets = useBucketActions()
 * await buckets.create.mutateAsync('new-bucket')
 * await buckets.delete.mutateAsync('old-bucket')
 */
export function useBucketActions() {
  const create = useCreateBucket();
  const deleteBucket = useDeleteBucket();

  return {
    create,
    delete: deleteBucket,

    isLoading: {
      create: create.isPending,
      delete: deleteBucket.isPending,
    },

    errors: {
      create: create.error,
      delete: deleteBucket.error,
    },
  };
}

/**
 * Get all object mutations in one hook
 * 
 * @example
 * const objects = useObjectActions()
 * await objects.upload.mutateAsync({ bucket: 'my-bucket', file: myFile })
 * await objects.delete.mutateAsync({ bucket: 'my-bucket', objectName: 'file.txt' })
 */
export function useObjectActions() {
  const upload = useFileUpload();
  const deleteObject = useDeleteObject();
  const getUrl = usePresignedGetUrl();
  const putUrl = usePresignedPutUrl();

  return {
    upload,
    delete: deleteObject,
    getDownloadUrl: getUrl,
    getUploadUrl: putUrl,

    isLoading: {
      upload: upload.isPending,
      delete: deleteObject.isPending,
      getDownloadUrl: getUrl.isPending,
      getUploadUrl: putUrl.isPending,
    },

    errors: {
      upload: upload.error,
      delete: deleteObject.error,
      getDownloadUrl: getUrl.error,
      getUploadUrl: putUrl.error,
    },
  };
}

/**
 * Get all storage mutations (buckets + objects) in one hook
 * 
 * @example
 * const storage = useStorageActions()
 * await storage.buckets.create.mutateAsync('new-bucket')
 * await storage.objects.upload.mutateAsync({ bucket: 'my-bucket', file: myFile })
 */
export function useStorageActions() {
  const buckets = useBucketActions();
  const objects = useObjectActions();

  return {
    buckets,
    objects,
  };
}
