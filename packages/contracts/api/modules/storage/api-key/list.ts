import { z } from 'zod/v4';
import { standard } from '@repo/orpc-utils';
import { apiKeySchema } from '../../../common/storage';

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, 'api-key');

// List API keys with pagination and optional filtering
export const apiKeyListContract = apiKeyOps
  .list({
    pagination: {
      defaultLimit: 20,
      maxLimit: 100,
      includeOffset: true,
    },
  })
  .input(b => {
    return b.extend({
      tags: b.entitySchema.shape.tags.optional(),
      bucketId: z.string().optional(),
      includeRevoked: z.boolean().default(false),
    });
  })
  .build();
