import { z } from 'zod/v4';
import { oc } from '@orpc/contract';

// List uploaded parts for a multipart upload
// Custom contract - part of multipart workflow, lists uploaded parts for a session
export const multipartListPartsContract = oc
  .route({
    method: 'GET',
    path: '/{bucket}/objects/{objectName}/multipart/{uploadId}/parts',
    summary: 'List uploaded parts',
    description: 'List all parts that have been uploaded for a multipart upload. Useful for checking upload progress.',
  })
  .input(
    z.object({
      bucket: z.string().min(1),
      objectName: z.string().min(1),
      uploadId: z.string().min(1),
    })
  )
  .output(
    z.object({
      parts: z.array(z.object({
        partNumber: z.number(),
        etag: z.string(),
        size: z.number(),
        uploadedAt: z.string(),
      })),
      bucket: z.string(),
      key: z.string(),
      uploadId: z.string(),
    })
  );
