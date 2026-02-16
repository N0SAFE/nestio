import { z } from 'zod/v4';
import { oc } from '@orpc/contract';

// Abort multipart upload
// Custom contract - part of multipart workflow, cancels session and cleans up parts
export const multipartAbortContract = oc
  .route({
    method: 'DELETE',
    path: '/:bucket/objects/*objectName/multipart/:uploadId',
    summary: 'Abort multipart upload',
    description: 'Cancel a multipart upload and cleanup all uploaded parts',
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
      uploadId: z.string(),
    })
)
  .output(
    z.object({
      success: z.boolean(),
      message: z.string(),
    })
  );
