import { standard } from '@repo/orpc-utils';
import { apiKeySchema } from '../../../common/storage';

// Create standard operations builder for API keys
const apiKeyOps = standard(apiKeySchema, 'api-key');

/**
 * Update API key metadata contract
 * PATCH /storage/api-keys/:keyId
 */
export const apiKeyUpdateContract = apiKeyOps
  .patch()
  .inputBuilder((b) =>
    // Only allow updating specific metadata fields (not permissions or IDs)
    b.pick(['name', 'description', 'metadata', 'tags']),
  )
  .build();
