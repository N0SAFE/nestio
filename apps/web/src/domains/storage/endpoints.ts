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
  bucketList: orpc.storage.bucketList,
  
  /**
   * Create a new bucket
   */
  bucketCreate: orpc.storage.bucketCreate,
  
  /**
   * Delete a bucket (must be empty)
   */
  bucketDelete: orpc.storage.bucketDelete,
  
  /**
   * Check if a bucket exists
   */
  bucketExists: orpc.storage.bucketExists,
  
  // =============================================================================
  // Object Operations
  // =============================================================================
  
  /**
   * List objects in a bucket with optional prefix filtering
   */
  objectList: orpc.storage.objectList,
  
  /**
   * Get object metadata (stat)
   */
  objectStat: orpc.storage.objectStat,
  
  /**
   * Upload an object (file)
   */
  objectUpload: orpc.storage.objectUpload,
  
  /**
   * Delete an object
   */
  objectDelete: orpc.storage.objectDelete,
  
  /**
   * Generate presigned GET URL for secure download
   */
  objectPresignedGetUrl: orpc.storage.objectPresignedGetUrl,
  
  /**
   * Generate presigned PUT URL for secure upload
   */
  objectPresignedPutUrl: orpc.storage.objectPresignedPutUrl,
} as const

export type StorageEndpoints = typeof storageEndpoints
