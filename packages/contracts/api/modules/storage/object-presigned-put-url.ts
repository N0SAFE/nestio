import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Generate presigned upload URL contract
export const objectPresignedPutUrlContract = oc
  .route({
    method: "POST",
    path: "/:bucket/objects/*/presigned-upload-url",
    summary: "Generate presigned upload URL",
    description: "Generate a temporary presigned URL for uploading an object",
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

export type ObjectPresignedPutUrlInput = z.infer<typeof objectPresignedPutUrlContract.InputSchema>;
export type ObjectPresignedPutUrlOutput = z.infer<typeof objectPresignedPutUrlContract.OutputSchema>;
