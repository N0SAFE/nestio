import { z } from "zod/v4";
import { oc } from "@orpc/contract";
import { objectSchema } from "../../common/storage";

// Get object metadata contract
export const objectStatContract = oc
  .route({
    method: "GET",
    path: "/:bucket/objects/*/stat",
    summary: "Get object metadata",
    description: "Get metadata and stats for an object without downloading it",
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
    }),
  )
  .output(objectSchema);

export type ObjectStatInput = z.infer<typeof objectStatContract.InputSchema>;
export type ObjectStatOutput = z.infer<typeof objectStatContract.OutputSchema>;
