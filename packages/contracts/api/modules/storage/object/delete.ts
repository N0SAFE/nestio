import { standard } from '@repo/orpc-utils';
import { objectSchema } from '../../../common/storage';
import { z } from 'zod/v4';

// Delete object using standard delete() with composite key
const objectOps = standard(objectSchema, 'object');

export const objectDeleteContract = objectOps
  .delete()
  .input(b => b.params(p => 
    p`/${p('bucket', z.string().min(3).max(63))}/objects/${p('objectName', z.string().min(1))}`
  ))
  .output(
    z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  )
  .build();

export type ObjectDeleteInput = z.infer<NonNullable<typeof objectDeleteContract['~orpc']['inputSchema']>>;
export type ObjectDeleteOutput = z.infer<NonNullable<typeof objectDeleteContract['~orpc']['outputSchema']>>;
