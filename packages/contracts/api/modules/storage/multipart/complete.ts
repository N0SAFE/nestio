import { z } from 'zod/v4';
import { oc } from '@orpc/contract';

// Complete multipart upload
// Custom contract - part of multipart workflow, assembles all parts into final object
export const multipartCompleteContract = oc
  .route({
    method: 'POST',
    path: '/:bucket/objects/*objectName/multipart/:uploadId/complete',
    summary: 'Complete multipart upload',
    description: 'Finalize a multipart upload by assembling all parts into the final object',
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
      uploadId: z.string(),
      parts: z.array(
        z.object({
          partNumber: z.number().int().min(1),
          etag: z.string(),
        })
      ).min(1),
    })
  )
  .output(
    z.object({
      etag: z.string(),
      size: z.number(),
      key: z.string(),
    })
  );
