import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Delete bucket contract
export const bucketDeleteContract = oc
  .route({
    method: "DELETE",
    path: "/:name",
    summary: "Delete a bucket",
    description: "Delete an empty storage bucket. The bucket must be empty before deletion.",
  })
  .input(
    z.object({
      name: z.string().min(3).max(63),
    }),
  )
  .output(
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  );

export type BucketDeleteInput = z.infer<NonNullable<typeof bucketDeleteContract['~orpc']['inputSchema']>>;
export type BucketDeleteOutput = z.infer<NonNullable<typeof bucketDeleteContract['~orpc']['outputSchema']>>;
