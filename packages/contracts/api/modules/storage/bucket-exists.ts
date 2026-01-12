import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Check if bucket exists contract
export const bucketExistsContract = oc
  .route({
    method: "GET",
    path: "/:name/exists",
    summary: "Check if bucket exists",
    description: "Check whether a bucket with the specified name exists",
  })
  .input(
    z.object({
      name: z.string().min(3).max(63),
    }),
  )
  .output(
    z.object({
      exists: z.boolean(),
      name: z.string(),
    }),
  );

export type BucketExistsInput = z.infer<typeof bucketExistsContract.InputSchema>;
export type BucketExistsOutput = z.infer<typeof bucketExistsContract.OutputSchema>;
