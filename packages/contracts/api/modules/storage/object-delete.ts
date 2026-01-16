import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Delete object contract
export const objectDeleteContract = oc
  .route({
    method: "DELETE",
    path: "/:bucket/objects/*objectName",
    summary: "Delete an object",
    description: "Delete a single object from a bucket",
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
    }),
  )
  .output(
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  );

export type ObjectDeleteInput = z.infer<NonNullable<typeof objectDeleteContract['~orpc']['inputSchema']>>;
export type ObjectDeleteOutput = z.infer<NonNullable<typeof objectDeleteContract['~orpc']['outputSchema']>>;
