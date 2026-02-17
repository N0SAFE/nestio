import { z } from 'zod/v4';
import { standard, createPaginationConfigSchema, defineQueryConfig } from '@repo/orpc-utils';
import { apiKeySchema } from '../../../common/storage';

// Create pagination config for API key listing
const paginationConfigSchema = createPaginationConfigSchema({
  defaultLimit: 20,
  maxLimit: 100,
  includeOffset: true,
} as const);

// Define query config for list operation
export const apiKeyListConfigSchemas = defineQueryConfig({
  pagination: paginationConfigSchema,
});

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, 'api-key');

// List API keys with pagination and optional filtering
export const apiKeyListContract = apiKeyOps
  .list(apiKeyListConfigSchemas)
  .input(b => {
    return b.extend({
      tags: b.entitySchema.shape.tags.optional(),
      bucketId: z.string().optional(),
      includeRevoked: z.boolean().default(false),
    });
  })
  .build();
