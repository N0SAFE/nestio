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
  size: number;
  contentType: string;
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
  data: Buffer;
  size?: number;
  metadata?: Record<string, string>;
  contentType?: string;
}

export interface GetObjectParams {
  bucket: string;
  objectName: string;
  /** Optional Range header value (e.g., "bytes=0-1023") */
  range?: string;
}

export interface GetObjectResult {
  /** Object data (full or partial based on range) */
  data: Buffer;
  /** Content type */
  contentType: string;
  /** Total file size */
  size: number;
  /** ETag for cache validation */
  etag: string;
  /** HTTP status code (200 for full, 206 for partial) */
  statusCode: 200 | 206;
  /** Content-Range header value (for 206 responses) */
  contentRange?: string;
  /** Accept-Ranges header value */
  acceptRanges: string;
  /** Content-Length (actual bytes returned) */
  contentLength: number;
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

/**
 * Presigned URL token payload
 * This is signed with HMAC-SHA256 for security
 */
export interface PresignedTokenPayload {
  /** Bucket name */
  bucket: string;
  /** Object key */
  key: string;
  /** Operation type: GET for download, PUT for upload */
  operation: "GET" | "PUT";
  /** Expiry timestamp in milliseconds */
  expires: number;
  /** Optional content type for PUT operations */
  contentType?: string;
  /** Optional max file size for PUT operations */
  maxSize?: number;
}
