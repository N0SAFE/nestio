'use client'

import { orpc } from '@/lib/orpc'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Storage hooks for managing buckets and objects
 * Following the unified hook pattern from the project
 */

// =============================================================================
// Bucket Hooks
// =============================================================================

/**
 * Hook to list all buckets
 */
export function useBuckets() {
  return useQuery(
    orpc.storage.bucketList.queryOptions({
      input: {},
    })
  )
}

/**
 * Hook to check if a bucket exists
 */
export function useBucketExists(bucketName: string) {
  return useQuery(
    orpc.storage.bucketExists.queryOptions({
      input: { name: bucketName },
    })
  )
}

/**
 * Hook to create a new bucket
 */
export function useCreateBucket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      return await orpc.storage.bucketCreate.call({ name })
    },
    onSuccess: (_, name) => {
      void queryClient.invalidateQueries({ queryKey: ['storage', 'bucketList'] })
      toast.success(`Bucket "${name}" created successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bucket: ${error.message}`)
    },
  })
}

/**
 * Hook to delete a bucket
 */
export function useDeleteBucket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      return await orpc.storage.bucketDelete.call({ name })
    },
    onSuccess: (_, name) => {
      void queryClient.invalidateQueries({ queryKey: ['storage', 'bucketList'] })
      toast.success(`Bucket "${name}" deleted successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete bucket: ${error.message}`)
    },
  })
}

// =============================================================================
// Object Hooks
// =============================================================================

/**
 * Hook to list objects in a bucket
 */
export function useObjects(bucket: string, prefix?: string) {
  return useQuery(
    orpc.storage.objectList.queryOptions({
      input: {
        bucket,
        prefix: prefix ?? '',
        maxKeys: 1000,
      },
    })
  )
}

/**
 * Hook to get object metadata
 */
export function useObjectStat(bucket: string, objectName: string) {
  return useQuery(
    orpc.storage.objectStat.queryOptions({
      input: {
        bucket,
        objectName,
      },
    })
  )
}

/**
 * Hook to delete an object
 */
export function useDeleteObject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bucket, objectName }: { bucket: string; objectName: string }) => {
      return await orpc.storage.objectDelete.call({ bucket, objectName })
    },
    onSuccess: (_, { objectName }) => {
      void queryClient.invalidateQueries({ queryKey: ['storage', 'objectList'] })
      toast.success(`Object "${objectName}" deleted successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete object: ${error.message}`)
    },
  })
}

/**
 * Hook to generate presigned download URL
 */
export function usePresignedGetUrl() {
  return useMutation({
    mutationFn: async ({
      bucket,
      objectName,
      expirySeconds = 3600,
    }: {
      bucket: string
      objectName: string
      expirySeconds?: number
    }) => {
      return await orpc.storage.objectPresignedGetUrl.call({
        bucket,
        objectName,
        expirySeconds,
      })
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate download URL: ${error.message}`)
    },
  })
}

/**
 * Hook to generate presigned upload URL
 */
export function usePresignedPutUrl() {
  return useMutation({
    mutationFn: async ({
      bucket,
      objectName,
      expirySeconds = 3600,
    }: {
      bucket: string
      objectName: string
      expirySeconds?: number
    }) => {
      return await orpc.storage.objectPresignedPutUrl.call({
        bucket,
        objectName,
        expirySeconds,
      })
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate upload URL: ${error.message}`)
    },
  })
}

/**
 * Hook to upload a file with progress tracking using ORPC's built-in XHR
 * 
 * The ORPC client has a FileUploadOpenAPILink that automatically handles:
 * - XHR-based uploads when File is in input
 * - Progress tracking via onProgress callback
 * - Proper multipart form data encoding
 */
export function useFileUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bucket,
      file,
      onProgress,
    }: {
      bucket: string
      file: File
      onProgress?: (progress: { loaded: number; total?: number; percent?: number }) => void
    }) => {
      // Use ORPC's built-in XHR upload with progress callback
      // The FileUploadOpenAPILink automatically detects the File input
      // and uses XMLHttpRequest with progress events
      const context: Record<string, unknown> = {}
      if (onProgress) {
        context.onProgress = onProgress
      }

      return await orpc.storage.objectUpload.call(
        {
          bucket,
          objectName: file.name,
          file,
        },
        {
            
        }
      )
    },
    onSuccess: (result, { file }) => {
      void queryClient.invalidateQueries({ queryKey: ['storage', 'objectList'] })
      toast.success(`File "${file.name}" uploaded successfully`)
    },
    onError: (error: Error, { file }) => {
      toast.error(`Failed to upload "${file.name}": ${error.message}`)
    },
  })
}
