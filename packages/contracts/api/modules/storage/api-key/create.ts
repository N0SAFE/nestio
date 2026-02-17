import { z } from "zod/v4";
import { standard } from "@repo/orpc-utils";
import { apiKeySchema } from "../../../common/storage";

// Create standard operations builder for API keys
const apiKeyOps = standard.zod(apiKeySchema, "api-key");

// Create contract with custom input (only fields allowed for creation) and extended output (includes plaintext key)
export const apiKeyCreateContract = apiKeyOps
    .create()
    .input((b) =>
        b.entitySchema
            .pick({
                name: true,
                description: true,
                permissions: true,
                bucketIds: true,
                allowedPrefixes: true,
                metadata: true,
                tags: true,
                rateLimitPerMinute: true,
                rateLimitPerDay: true,
            })
            .extend({
                expiresInDays: z.number().positive().max(365).optional(),
            }),
    )
    .output((b) =>
        b.entitySchema.extend({
            key: z.string().describe("Plaintext API key - shown only once"),
        }),
    )
    .build();
