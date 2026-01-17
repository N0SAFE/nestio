/**
 * Storage Domain - Cache Invalidation Configuration
 *
 * Defines which queries to invalidate when mutations succeed.
 * Ensures UI stays in sync with server state.
 */

import { defineInvalidations } from "../shared/helpers";
import { storageEndpoints } from "./endpoints";

/**
 * Storage invalidation configuration
 *
 * Maps each mutation to the queries it should invalidate:
 * 
 * Bucket operations:
 * - bucketCreate: Invalidates bucket list
 * - bucketDelete: Invalidates bucket list and the specific bucket's existence check
 * 
 * Object operations:
 * - objectUpload: Invalidates object list for the bucket
 * - objectDelete: Invalidates object list and the specific object's stat
 */
export const storageInvalidations = defineInvalidations(storageEndpoints, {
  // =============================================================================
  // Bucket Mutations
  // =============================================================================
  
  /**
   * After creating a bucket, invalidate the bucket list
   */
  bucketCreate: ({ keys }) => [
    keys.bucketList(),
  ],
  
  /**
   * After deleting a bucket, invalidate:
   * - The bucket list
   * - The bucket existence check for this specific bucket
   */
  bucketDelete: ({ input, keys }) => [
    keys.bucketList(),
    keys.bucketExists({ input: { name: input.name } }),
  ],
  
  // =============================================================================
  // Object Mutations
  // =============================================================================
  
  /**
   * After uploading an object, invalidate:
   * - Object list for this bucket (with and without prefix)
   * - Object stat for this specific object
   */
  objectUpload: ({ input, keys }) => [
    // Invalidate all object lists for this bucket
    keys.objectList({ input: { bucket: input.bucket } }),
    // Also invalidate with the specific prefix if it exists
    ...(input.objectName.includes('/')
      ? [keys.objectList({ 
          input: { 
            bucket: input.bucket, 
            prefix: input.objectName.substring(0, input.objectName.lastIndexOf('/') + 1)
          } 
        })]
      : []),
    // Invalidate stat for this specific object
    keys.objectStat({ input: { bucket: input.bucket, objectName: input.objectName } }),
  ],
  
  /**
   * After deleting an object, invalidate:
   * - Object list for this bucket
   * - Object stat for this specific object
   */
  objectDelete: ({ input, keys }) => [
    // Invalidate all object lists for this bucket
    keys.objectList({ input: { bucket: input.bucket } }),
    // Also invalidate with the specific prefix if it exists
    ...(input.objectName.includes('/')
      ? [keys.objectList({ 
          input: { 
            bucket: input.bucket, 
            prefix: input.objectName.substring(0, input.objectName.lastIndexOf('/') + 1)
          } 
        })]
      : []),
    // Invalidate stat for this specific object
    keys.objectStat({ input: { bucket: input.bucket, objectName: input.objectName } }),
  ],
});
