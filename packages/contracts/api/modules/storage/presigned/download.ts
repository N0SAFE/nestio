import { z } from "zod/v4";
import { oc } from "@orpc/contract";

// Handle presigned download (GET with token)
export const presignedDownloadContract = oc
  .route({
    method: "GET",
    path: "/presigned/:token",
    summary: "Download object using presigned URL token",
    description: "Download an object using a presigned JWT token. Supports HTTP range requests (RFC 7233) for partial content. No authentication required - token validates the request.",
    inputStructure: "detailed",
    outputStructure: "detailed",
  })
  .input(
    z.object({
      params: z.object({
        token: z.string().min(1),
      }),
      headers: z.object({
        range: z.string().optional(),
      }).optional(),
    }),
  )
  .output(
    z.union([
      z.object({
        status: z.literal(200),
        headers: z.object({
          "content-type": z.string(),
          "etag": z.string(),
          "accept-ranges": z.literal("bytes"),
          "content-length": z.string(),
          "content-disposition": z.string(),
        }),
        body: z.instanceof(Buffer),
      }),
      z.object({
        status: z.literal(206),
        headers: z.object({
          "content-type": z.string(),
          "etag": z.string(),
          "accept-ranges": z.literal("bytes"),
          "content-range": z.string(),
          "content-length": z.string(),
          "content-disposition": z.string(),
        }),
        body: z.instanceof(Buffer),
      }),
    ]),
  );

export type PresignedDownloadInput = z.infer<NonNullable<typeof presignedDownloadContract['~orpc']['inputSchema']>>;
export type PresignedDownloadOutput = z.infer<NonNullable<typeof presignedDownloadContract['~orpc']['outputSchema']>>;
