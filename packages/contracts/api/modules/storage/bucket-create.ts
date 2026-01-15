import { z } from "zod/v4";
import { oc } from "@orpc/contract";
import { bucketSchema } from "../../common/storage";

// Create bucket contract
export const bucketCreateContract = oc
  .route({
    method: "POST",
    path: "/",
    summary: "Create a new bucket",
    description: "Create a new storage bucket with the specified name",
  })
  .input(
    z.object({
      name: z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 
        'Bucket name must be 3-63 chars, lowercase, start/end with alphanumeric'),
    }),
  )
  .output(bucketSchema);

export type BucketCreateInput = z.infer<typeof bucketCreateContract['~orpc']['inputSchema']>;
export type BucketCreateOutput = z.infer<typeof bucketCreateContract['~orpc']['outputSchema']>;