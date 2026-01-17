import { z } from "zod/v4";
import { oc } from "@orpc/contract";
import { objectListSchema } from "../../common/storage";

// List objects in bucket contract
export const objectListContract = oc
  .route({
    method: "GET",
    path: "/:bucket/objects",
    summary: "List objects in a bucket",
    description: "List all objects in a bucket with optional prefix filtering and pagination",
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      prefix: z.string().optional(),
      recursive: z.boolean().optional().default(true),
      maxKeys: z.number().int().min(1).max(10000).optional().default(1000),
      continuationToken: z.string().optional(),
    }),
  )
  .output(objectListSchema);

export type ObjectListInput = z.infer<NonNullable<typeof objectListContract['~orpc']['inputSchema']>>;
export type ObjectListOutput = z.infer<NonNullable<typeof objectListContract['~orpc']['outputSchema']>>;
