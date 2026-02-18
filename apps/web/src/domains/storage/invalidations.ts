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
    keys.bucketExists({ input: { params: { name: input.params.name } } }),
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
    keys.objectList({
      input: {
        params: { bucket: input.params.bucket },
        query: {},
      },
    }),
    // Also invalidate with the specific prefix if it exists
    ...(input.body.objectName.includes('/')
      ? [keys.objectList({ 
          input: { 
            params: { bucket: input.params.bucket },
            query: {
              prefix: input.body.objectName.substring(0, input.body.objectName.lastIndexOf('/') + 1),
            },
          } 
        })]
      : []),
    // Invalidate stat for this specific object
    keys.objectStat({ input: { params: { id: input.body.objectName, bucket: input.params.bucket, objectName: input.body.objectName } } }),
  ],
  
  /**
   * After deleting an object, invalidate:
   * - Object list for this bucket
   * - Object stat for this specific object
   */
  objectDelete: ({ input, keys }) => [
    // Invalidate all object lists for this bucket
    keys.objectList({
      input: {
        params: { bucket: input.params.bucket },
        query: {},
      },
    }),
    // Also invalidate with the specific prefix if it exists
    ...(input.params.objectName.includes('/')
      ? [keys.objectList({ 
          input: {
            params: { bucket: input.params.bucket },
            query: {
              prefix: input.params.objectName.substring(0, input.params.objectName.lastIndexOf('/') + 1),
            },
          } 
        })]
      : []),
    // Invalidate stat for this specific object
    keys.objectStat({ input: { params: { id: input.params.objectName, bucket: input.params.bucket, objectName: input.params.objectName } } }),
  ],
});
