import { oc } from "@orpc/contract";

// Import module routers
import { bucketRouter } from './bucket';
import { objectRouter } from './object';
import { multipartRouter } from './multipart';
import { presignedRouter } from './presigned';

// Combine into main storage contract
export const storageContract = oc.tag("Storage").prefix("/storage").router({
  bucket: bucketRouter,
  object: objectRouter,
  multipart: multipartRouter,
  presigned: presignedRouter,
});

export type StorageContract = typeof storageContract;

// Re-export everything from module folders
export * from './bucket';
export * from './object';
export * from './multipart';
export * from './presigned';
