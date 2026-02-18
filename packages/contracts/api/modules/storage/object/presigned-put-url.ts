import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Generate presigned upload URL using standard update() for PUT endpoint
const objectOps = standard.zod(objectSchema, "object");

export const objectPresignedPutUrlContract = objectOps
    .update()
    .input((b) =>
        b
            .params((p) => p`/${p("bucket", z.string().min(3).max(63))}/objects/${p("objectName", z.string().min(1))}/presigned-upload-url`)
            .query(
                z.object({
                    expirySeconds: z.number().int().min(1).max(604800).optional().default(3600),
                }),
            ),
    )
    .output( z.object({
                url: z.url(),
                expiresAt: z.iso.datetime(),
            }),
    )
    .build();

export type ObjectPresignedPutUrlInput = z.infer<NonNullable<(typeof objectPresignedPutUrlContract)["~orpc"]["inputSchema"]>>;
export type ObjectPresignedPutUrlOutput = z.infer<NonNullable<(typeof objectPresignedPutUrlContract)["~orpc"]["outputSchema"]>>;
