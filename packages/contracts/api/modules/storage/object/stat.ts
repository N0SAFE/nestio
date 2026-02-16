import { standard } from "@repo/orpc-utils";
import { objectSchema } from "../../../common/storage";
import { z } from "zod/v4";

// Stat object - Get object metadata using standard read() with composite key
const objectOps = standard(objectSchema, "object");

export const objectStatContract = objectOps
    .read()
    .input((b) => b.params((p) => p`/${p("bucket", z.string().min(3).max(63))}/objects/${p("objectName", z.string().min(1))}/stat`))
    .build();
