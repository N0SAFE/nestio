import { oc } from '@orpc/contract';
import { apiKeyCreateContract } from './create';
import { apiKeyListContract } from './list';
import { apiKeyGetContract } from './get';
import { apiKeyRevokeContract } from './revoke';
import { apiKeyUpdateContract } from './update';

export const apiKeyRouter = oc.router({
  create: apiKeyCreateContract,
  list: apiKeyListContract,
  get: apiKeyGetContract,
  revoke: apiKeyRevokeContract,
  update: apiKeyUpdateContract,
});

export * from './create';
export * from './list';
export * from './get';
export * from './revoke';
export * from './update';
