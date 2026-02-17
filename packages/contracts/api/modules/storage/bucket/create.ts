import { standard } from '@repo/orpc-utils';
import { bucketSchema } from '../../../common/storage';

// Create standard operations builder for buckets
const bucketOps = standard.zod(bucketSchema, 'bucket');

// Create bucket contract - Only accept name as input
export const bucketCreateContract = bucketOps
  .create()
  .input((b) => b.entitySchema.pick({name: true}))
  .build();