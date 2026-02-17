import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Batch delete using standard batchDelete() adapted for bucket-scoped deletion
const objectOps = standard.zod(objectSchema, "object");

export const objectBatchDeleteContract = objectOps
    .batchDelete()
    .input((b) =>
        b
            .params((p) => p`/${p("bucket", z.string().min(1))}/objects/batch-delete`)
            .body((b) =>
                b.schema(() =>
                    z.object({
                        objects: z.array(z.string().min(1)).min(1).max(1000),
                    }),
                ),
            ),
    )
    .output(
        z.object({
            deleted: z.array(
                z.object({
                    key: z.string(),
                }),
            ),
            errors: z
                .array(
                    z.object({
                        key: z.string(),
                        code: z.string(),
                        message: z.string(),
                    }),
                )
                .optional(),
        }),
    )

    .build();

export type ObjectBatchDeleteInput = z.infer<NonNullable<(typeof objectBatchDeleteContract)["~orpc"]["inputSchema"]>>;
export type ObjectBatchDeleteOutput = z.infer<NonNullable<(typeof objectBatchDeleteContract)["~orpc"]["outputSchema"]>>;
