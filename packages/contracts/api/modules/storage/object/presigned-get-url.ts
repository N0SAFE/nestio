import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Generate presigned download URL using standard read() for GET endpoint
const objectOps = standard.zod(objectSchema, "object");

export const objectPresignedGetUrlContract = objectOps
    .read()
    .input((b) =>
        b
            .params((p) => p`/${p("bucket", z.string().min(3).max(63))}/objects/${p("objectName", z.string().min(1))}/presigned-url`)
            .query(
                z.object({
                    expirySeconds: z.number().int().min(1).max(604800).optional().default(3600),
                }),
            ),
    )
    .output(
        z.object({
            url: z.url(),
            expiresAt: z.iso.datetime(),
        }),
    )
    .build();

export type ObjectPresignedGetUrlInput = z.infer<NonNullable<(typeof objectPresignedGetUrlContract)["~orpc"]["inputSchema"]>>;
export type ObjectPresignedGetUrlOutput = z.infer<NonNullable<(typeof objectPresignedGetUrlContract)["~orpc"]["outputSchema"]>>;
