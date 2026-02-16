import { oc } from "@orpc/contract";
import { objectListContract } from './list';
import { objectDeleteContract } from './delete';
import { objectStatContract } from './stat';
import { objectPresignedGetUrlContract } from './presigned-get-url';
import { objectPresignedPutUrlContract } from './presigned-put-url';
import { objectUploadContract } from './upload';
import { objectHeadContract } from './head';
import { objectBatchDeleteContract } from './batch-delete';
import { objectCopyContract } from './copy';

export const objectRouter = oc.router({
  list: objectListContract,
  delete: objectDeleteContract,
  stat: objectStatContract,
  presignedGetUrl: objectPresignedGetUrlContract,
  presignedPutUrl: objectPresignedPutUrlContract,
  upload: objectUploadContract,
  head: objectHeadContract,
  batchDelete: objectBatchDeleteContract,
  copy: objectCopyContract,
});

export * from './list';
export * from './delete';
export * from './stat';
export * from './presigned-get-url';
export * from './presigned-put-url';
export * from './upload';
export * from './head';
export * from './batch-delete';
export * from './copy';