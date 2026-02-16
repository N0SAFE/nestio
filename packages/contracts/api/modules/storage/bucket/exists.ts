import { standard } from '@repo/orpc-utils';
import { bucketSchema } from '../../../common/storage';
import { z } from 'zod/v4';

// Create standard operations builder for buckets
const bucketOps = standard(bucketSchema, 'bucket');

// Check if bucket exists by name using standard exists()
export const bucketExistsContract = bucketOps
  .exists({
    idFieldName: 'name',
    idSchema: z.string().min(3).max(63),
  })
  .input(b =>
    z.uuid()
  )
  .output(b =>
    bucketSchema.extend({
      name: z.string(),
    })
  )
  .build();
