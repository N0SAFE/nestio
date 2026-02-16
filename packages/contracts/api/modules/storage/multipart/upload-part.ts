import { z } from 'zod/v4';
import { oc } from '@orpc/contract';

// Upload a part in multipart upload
// Custom contract - part of multipart workflow with file upload
export const multipartUploadPartContract = oc
  .route({
    method: 'PUT',
    path: '/:bucket/objects/*objectName/multipart/:uploadId/parts/:partNumber',
    summary: 'Upload multipart part',
    description: 'Upload a single part of a multipart upload',
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
      uploadId: z.string(),
      partNumber: z.number().int().min(1).max(10000),
      file: z.instanceof(File),
    })
  )
  .output(
    z.object({
      etag: z.string(),
      partNumber: z.number(),
    })
  );
