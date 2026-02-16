import { oc } from "@orpc/contract";
import { bucketListContract } from './list';
import { bucketCreateContract } from './create';
import { bucketDeleteContract } from './delete';
import { bucketExistsContract } from './exists';

export const bucketRouter = oc.router({
  list: bucketListContract,
  create: bucketCreateContract,
  delete: bucketDeleteContract,
  exists: bucketExistsContract,
});

export * from './list';
export * from './create';
export * from './delete';
export * from './exists';
