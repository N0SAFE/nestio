import { standard } from '@repo/orpc-utils';
import { bucketSchema } from '../../../common/storage';
import { z } from 'zod/v4';

// Create standard operations builder for buckets
const bucketOps = standard(bucketSchema, 'bucket');

// Delete bucket contract - Using standard delete with custom name field
export const bucketDeleteContract = bucketOps
  .delete({
    idFieldName: 'name',
    idSchema: z.string().min(3).max(63),
  })
  .build();
