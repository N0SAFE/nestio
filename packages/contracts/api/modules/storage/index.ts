import { oc } from "@orpc/contract";

// Import all bucket contracts
import { bucketListContract } from './bucket-list';
import { bucketCreateContract } from './bucket-create';
import { bucketDeleteContract } from './bucket-delete';
import { bucketExistsContract } from './bucket-exists';

// Import all object contracts
import { objectListContract } from './object-list';
import { objectDeleteContract } from './object-delete';
import { objectStatContract } from './object-stat';
import { objectPresignedGetUrlContract } from './object-presigned-get-url';
import { objectPresignedPutUrlContract } from './object-presigned-put-url';

// Combine into main storage contract
export const storageContract = oc.tag("Storage").prefix("/storage").router({
  // Bucket operations
  bucketList: bucketListContract,
  bucketCreate: bucketCreateContract,
  bucketDelete: bucketDeleteContract,
  bucketExists: bucketExistsContract,
  
  // Object operations
  objectList: objectListContract,
  objectDelete: objectDeleteContract,
  objectStat: objectStatContract,
  objectPresignedGetUrl: objectPresignedGetUrlContract,
  objectPresignedPutUrl: objectPresignedPutUrlContract,
});

export type StorageContract = typeof storageContract;

// Re-export everything from individual contracts
export * from './bucket-list';
export * from './bucket-create';
export * from './bucket-delete';
export * from './bucket-exists';
export * from './object-list';
export * from './object-delete';
export * from './object-stat';
export * from './object-presigned-get-url';
export * from './object-presigned-put-url';
