import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// HEAD object metadata - Check if object exists without downloading body using standard read()
const objectOps = standard.zod(objectSchema, "object");

export const objectHeadContract = objectOps
    .read()
    .input((b) =>
        b
            .params((p) => p`/${p("bucket", z.string().min(1))}/objects/${p("objectName", z.string().min(1))}`)
            .headers((h) =>
                h.schema(() =>
                    z
                        .object({
                            "if-match": z.string().optional(),
                            "if-none-match": z.string().optional(),
                            "if-modified-since": z.string().optional(),
                            "if-unmodified-since": z.string().optional(),
                        })
                        .optional(),
                ),
            ),
    )
    .output(
        z.union([
            z.object({
                status: z.literal(200),
                body: z.null(),
                headers: z.object({
                    "content-type": z.string(),
                    "content-length": z.string(),
                    etag: z.string(),
                    "last-modified": z.string(),
                    "accept-ranges": z.literal("bytes"),
                }),
            }),
            z.object({
                status: z.literal(304),
                body: z.null(),
                headers: z.object({
                    etag: z.string(),
                    "last-modified": z.string(),
                }),
            }),
        ]),
    )
    .build();

export type ObjectHeadInput = z.infer<NonNullable<(typeof objectHeadContract)["~orpc"]["inputSchema"]>>;
export type ObjectHeadOutput = z.infer<NonNullable<(typeof objectHeadContract)["~orpc"]["outputSchema"]>>;
