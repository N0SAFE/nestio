import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Handle presigned upload (PUT with token and file data)
export const presignedUploadContract = oc
  .route({
    method: "PUT",
    path: "/presigned/:token",
    summary: "Upload object using presigned URL token",
    description: "Upload an object using a presigned JWT token. No authentication required - token validates the request.",
  })
  .input(
    z.object({
      token: z.string().min(1),
      file: z.instanceof(File),
      contentType: z.string().optional(),
    }),
  )
  .output(
    z.object({
      etag: z.string(),
      size: z.number(),
      contentType: z.string(),
    }),
  );

export type PresignedUploadInput = z.infer<NonNullable<typeof presignedUploadContract['~orpc']['inputSchema']>>;
export type PresignedUploadOutput = z.infer<NonNullable<typeof presignedUploadContract['~orpc']['outputSchema']>>;
