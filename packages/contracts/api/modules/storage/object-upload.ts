import { oc } from "@orpc/contract";
import { z } from "zod";

export const objectUploadContract = oc.route({
  method: "POST",
  path: "/{bucket}/objects/upload",
})
  .input(
    z.object({
      bucket: z.string().describe("Bucket name"),
      objectName: z.string().describe("Object key/name"),
      file: z.file().describe("File to upload"),
    })
  )
  .output(
    z.object({
      name: z.string(),
      key: z.string(),
      size: z.number(),
      etag: z.string(),
      contentType: z.string(),
    })
  );

export type ObjectUploadInput = z.infer<typeof objectUploadContract>;
export type ObjectUploadOutput = z.infer<typeof objectUploadContract>;
