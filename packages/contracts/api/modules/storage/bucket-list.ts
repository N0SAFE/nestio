import { z } from "zod/v4";
import { oc } from "@orpc/contract";
import { bucketSchema } from "../../common/storage";

// List buckets contract
export const bucketListContract = oc
  .route({
    method: "GET",
    path: "/",
    summary: "List all buckets",
    description: "Retrieve a list of all storage buckets accessible by the user",
  })
  .input(z.object({}))
  .output(
    z.object({
      buckets: z.array(bucketSchema),
      total: z.number().int().min(0),
    }),
  );

export type BucketListInput = z.infer<NonNullable<typeof bucketListContract['~orpc']['inputSchema']>>;
export type BucketListOutput = z.infer<NonNullable<typeof bucketListContract['~orpc']['outputSchema']>>;
