import { standard } from '@repo/orpc-utils';
import { apiKeySchema } from '../../../common/storage';

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, 'api-key');

/**
 * Get API key details contract
 * GET /storage/api-keys/:keyId
 */
export const apiKeyGetContract = apiKeyOps.read().build();