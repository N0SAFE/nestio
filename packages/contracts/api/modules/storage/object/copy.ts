import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Copy object using standard create() for POST destination
const objectOps = standard.zod(objectSchema, "object");

export const objectCopyContract = objectOps
    .create()
    .input((b) =>
        b
            .params((p) => p`/${p("destinationBucket", z.string().min(1))}/objects/${p("destinationKey", z.string().min(1))}/copy`)
            .body(
                z.object({
                    sourceBucket: z.string().min(1),
                    sourceKey: z.string().min(1),
                    metadataDirective: z.enum(["COPY", "REPLACE"]).optional().default("COPY"),
                    contentType: z.string().optional(),
                    metadata: z.record(z.string(), z.string()).optional(),
                }),
            ),
    )
    .output(
        z.object({
            etag: z.string(),
            lastModified: z.string(),
            size: z.number(),
        }),
    )
    .build();

export type ObjectCopyInput = z.infer<NonNullable<(typeof objectCopyContract)["~orpc"]["inputSchema"]>>;
export type ObjectCopyOutput = z.infer<NonNullable<(typeof objectCopyContract)["~orpc"]["outputSchema"]>>;
