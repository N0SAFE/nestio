import { standard } from "@repo/orpc-utils";
import { apiKeySchema } from "../../../common/storage";

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, "api-key");

/**
 * Update API key metadata contract
 * PATCH /storage/api-keys/:keyId
 */
export const apiKeyUpdateContract = apiKeyOps
    .patch()
    .input((b) =>
        // Only allow updating specific metadata fields (not permissions or IDs)
        b.entitySchema.pick({
            name: true,
            description: true,
            metadata: true,
            tags: true,
        }),
    )
    .build();
