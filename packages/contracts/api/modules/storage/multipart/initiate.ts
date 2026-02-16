import { z } from 'zod/v4';
import { oc } from '@orpc/contract';

// Initiate multipart upload
// Custom contract - multipart operations form a workflow (initiate → upload → complete/abort)
export const multipartInitiateContract = oc
  .route({
    method: 'POST',
    path: '/:bucket/objects/*objectName/multipart',
    summary: 'Initiate multipart upload',
    description: 'Start a multipart upload session for uploading large files in chunks',
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
      contentType: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    })
  )
  .output(
    z.object({
      uploadId: z.string(),
      bucket: z.string(),
      key: z.string(),
    })
  );
