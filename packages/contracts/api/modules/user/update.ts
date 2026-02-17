import { standard } from "@repo/orpc-utils";
import { userSchema } from "@repo/api-contracts/common/user";

// Create standard operations builder for users
const userOps = standard.zod(userSchema, "user");

// Create update contract using standard builder
export const userUpdateContract = userOps
    .update()
    .input((b) => b.entitySchema.omit(["image", "id"]).partial().extend({ id: userSchema.shape.id }))
    .build();
