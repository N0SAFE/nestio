import { orpc } from '@/lib/orpc'

/**
 * Storage domain endpoints
 * 
 * All storage endpoints use ORPC contracts directly.
 * Provides S3-compatible bucket and object operations.
 */
export const storageEndpoints = {
  // =============================================================================
  // Bucket Operations
  // =============================================================================
  
  /**
   * List all buckets
   */
  bucketList: orpc.storage.bucket.list,
  
  /**
   * Create a new bucket
   */
  bucketCreate: orpc.storage.bucket.create,
  
  /**
   * Delete a bucket (must be empty)
   */
  bucketDelete: orpc.storage.bucket.delete,
  
  /**
   * Check if a bucket exists
   */
  bucketExists: orpc.storage.bucket.exists,
  
  // =============================================================================
  // Object Operations
  // =============================================================================
  
  /**
   * List objects in a bucket with optional prefix filtering
   */
  objectList: orpc.storage.object.list,
  
  /**
   * Get object metadata (stat)
   */
  objectStat: orpc.storage.object.stat,
  
  /**
   * Upload an object (file)
   */
  objectUpload: orpc.storage.object.upload,
  
  /**
   * Delete an object
   */
  objectDelete: orpc.storage.object.delete,
  
  /**
   * Generate presigned GET URL for secure download
   */
  objectPresignedGetUrl: orpc.storage.object.presignedGetUrl,
  
  /**
   * Generate presigned PUT URL for secure upload
   */
  objectPresignedPutUrl: orpc.storage.object.presignedPutUrl,
} as const

export type StorageEndpoints = typeof storageEndpoints
