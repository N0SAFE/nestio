export interface BucketInfo {
  name: string;
  creationDate: Date;
}

export interface ObjectInfo {
  name: string;
  size: number;
  etag: string;
  lastModified: Date;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface ObjectListResult {
  objects: ObjectInfo[];
  prefixes: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface UploadResult {
  etag: string;
  versionId?: string;
}

export interface SignedUrlParams {
  bucket: string;
  objectName: string;
  expirySeconds?: number;
}

export interface PutObjectParams {
  bucket: string;
  objectName: string;
  data: Buffer | ReadableStream;
  size?: number;
  metadata?: Record<string, string>;
  contentType?: string;
}

export interface GetObjectParams {
  bucket: string;
  objectName: string;
}

export interface ListObjectsParams {
  bucket: string;
  prefix?: string;
  recursive?: boolean;
  maxKeys?: number;
  continuationToken?: string;
}

export interface DeleteObjectParams {
  bucket: string;
  objectName: string;
}

export interface CopyObjectParams {
  sourceBucket: string;
  sourceObject: string;
  destinationBucket: string;
  destinationObject: string;
}
