import { z } from 'zod/v4';
import { createFilterConfig, standard } from '@repo/orpc-utils';
import { apiKeySchema } from '../../../common/storage';

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, 'api-key');

// Build reusable list config with pagination and filtering
const apiKeyListConfig = createFilterConfig(apiKeyOps)
    .withPagination({
        defaultLimit: 20,
        maxLimit: 100,
        includeOffset: true,
    })
    .withFiltering({
        tags: apiKeySchema.shape.tags,
        bucketId: {
            schema: z.string(),
            operators: ['eq'] as const,
        },
        includeRevoked: {
            schema: z.boolean(),
            operators: ['eq'] as const,
        },
    })
    .buildConfig();

export const apiKeyListContract = apiKeyOps.list(apiKeyListConfig).build();
