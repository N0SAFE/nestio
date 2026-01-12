import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Generate presigned download URL contract
export const objectPresignedGetUrlContract = oc
  .route({
    method: "POST",
    path: "/:bucket/objects/*/presigned-url",
    summary: "Generate presigned download URL",
    description: "Generate a temporary presigned URL for downloading an object",
  })
  .input(
    z.object({
      bucket: z.string().min(3).max(63),
      objectName: z.string().min(1),
      expirySeconds: z.number().int().min(1).max(604800).optional().default(3600), // Max 7 days
    }),
  )
  .output(
    z.object({
      url: z.string().url(),
      expiresAt: z.iso.datetime(),
    }),
  );

export type ObjectPresignedGetUrlInput = z.infer<typeof objectPresignedGetUrlContract.InputSchema>;
export type ObjectPresignedGetUrlOutput = z.infer<typeof objectPresignedGetUrlContract.OutputSchema>;
