import { standard } from "@repo/orpc-utils";
import { bucketSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Create standard operations builder for buckets
const bucketOps = standard.zod(bucketSchema, "bucket");

// List buckets contract - Custom output format for S3 compatibility
export const bucketListContract = bucketOps
    .list()
    .output(
        z.object({
            buckets: z.array(bucketSchema),
            total: z.number().int().min(0),
        }),
    )
    .build();
