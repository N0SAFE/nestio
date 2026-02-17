import { standard } from '@repo/orpc-utils';
import { objectListSchema, objectSchema } from '../../../common/storage';
import { z } from 'zod/v4';

// List objects in bucket using standard list() with bucket-scoped filtering
const objectOps = standard.zod(objectSchema, 'object');

export const objectListContract = objectOps
  .list()
  .input(b => b.params(p => 
    p`/${p('bucket', z.string().min(3).max(63))}`
  ).query(q => 
    q.schema(() => z.object({
      prefix: z.string().optional(),
      recursive: z.boolean().optional().default(true),
      maxKeys: z.number().int().min(1).max(10000).optional().default(1000),
      continuationToken: z.string().optional(),
    }))
  ))
  .output(objectListSchema)
  .build();

export type ObjectListInput = z.infer<NonNullable<typeof objectListContract['~orpc']['inputSchema']>>;
export type ObjectListOutput = z.infer<NonNullable<typeof objectListContract['~orpc']['outputSchema']>>;
