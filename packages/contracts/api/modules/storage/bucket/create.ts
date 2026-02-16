import { standard } from '@repo/orpc-utils';
import { bucketSchema } from '../../../common/storage';

// Create standard operations builder for buckets
const bucketOps = standard(bucketSchema, 'bucket');

// Create bucket contract - Only accept name as input
export const bucketCreateContract = bucketOps
  .create()
  .input((b) => b.pick(['name']))
  .build();