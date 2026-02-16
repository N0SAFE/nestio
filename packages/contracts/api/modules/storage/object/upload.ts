import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Upload object using standard create() for POST
const objectOps = standard(objectSchema, "object");

export const objectUploadContract = objectOps
    .create()
    .input((b) =>
        b
            .params((p) => p`/${p("bucket", z.string())}/objects/upload`)
            .body((b) =>
                b.schema(() =>
                    z.object({
                        objectName: z.string().describe("Object key/name"),
                        file: z.file().describe("File to upload"),
                    }),
                ),
            ),
    )
    .output(
        z.object({
            name: z.string(),
            key: z.string(),
            size: z.number(),
                etag: z.string(),
                contentType: z.string(),
            }),
    )
    .build();

export type ObjectUploadInput = z.infer<NonNullable<(typeof objectUploadContract)["~orpc"]["inputSchema"]>>;
export type ObjectUploadOutput = z.infer<NonNullable<(typeof objectUploadContract)["~orpc"]["outputSchema"]>>;
