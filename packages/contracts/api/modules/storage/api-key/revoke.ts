import { z } from 'zod/v4';
import { standard } from '@repo/orpc-utils';
import { apiKeySchema } from '../../../common/storage';

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, 'api-key');

/**
 * Revoke API key contract
 * DELETE /storage/api-keys/:keyId/revoke
 * 
 * Soft delete operation using the standard softDelete method
 * Immediately revokes an API key, preventing all future requests
 */
export const apiKeyRevokeContract = apiKeyOps
  .softDelete({ pathSuffix: '/revoke' })
  .input((b) =>
    b.extend({
      reason: z.string()
        .max(500, 'Reason must be 500 characters or less')
        .optional(),
    })
  )
  .build();
