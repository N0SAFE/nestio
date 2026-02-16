import { standard } from "@repo/orpc-utils";
import { userSchema } from "@repo/api-contracts/common/user";

// Create standard operations builder for users
const userOps = standard(userSchema, "user");

// Create create contract using builder - pick body fields only
export const userCreateContract = userOps
  .create()
  .input((b) => b.body((body) => body.schema((s) => s.pick({ name: true, email: true, image: true }))))
  .build();
