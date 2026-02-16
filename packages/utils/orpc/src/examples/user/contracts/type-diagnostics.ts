/**
 * Type Diagnostics - Extract and display raw inferred types
 * 
 * This file extracts the actual TypeScript-inferred types for all contracts
 * to diagnose what's going wrong with type inference.
 */

import type { InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract';
import {
  userListContract,
  userReadContract,
  userCreateContract,
  userUpdateContract,
  userDeleteContract,
  userCountContract,
  userExistsContract,
  userSoftDeleteContract,
  userArchiveContract,
  userRestoreContract,
  userBatchCreateContract,
  userBatchDeleteContract,
  userBatchReadContract,
  userBatchUpdateContract,
  userStreamingListContract,
  userStreamingReadContract,
  userStreamingSearchContract,
  userCreateMinimalContract,
  userUpdatePartialContract,
  userListWithCustomPathContract,
  userPublicProfileContract,
  userCreateWithRoleContract,
} from './standard';

// ============================================================================
// RAW TYPE EXTRACTION
// ============================================================================

// Core CRUD
export type UserListInput = InferContractRouterInputs<typeof userListContract>;
export type UserListOutput = InferContractRouterOutputs<typeof userListContract>;

export type UserReadInput = InferContractRouterInputs<typeof userReadContract>;
export type UserReadOutput = InferContractRouterOutputs<typeof userReadContract>;

export type UserCreateInput = InferContractRouterInputs<typeof userCreateContract>;
export type UserCreateOutput = InferContractRouterOutputs<typeof userCreateContract>;

export type UserUpdateInput = InferContractRouterInputs<typeof userUpdateContract>;
export type UserUpdateOutput = InferContractRouterOutputs<typeof userUpdateContract>;

export type UserDeleteInput = InferContractRouterInputs<typeof userDeleteContract>;
export type UserDeleteOutput = InferContractRouterOutputs<typeof userDeleteContract>;

// Additional operations
export type UserCountInput = InferContractRouterInputs<typeof userCountContract>;
export type UserCountOutput = InferContractRouterOutputs<typeof userCountContract>;

export type UserExistsInput = InferContractRouterInputs<typeof userExistsContract>;
export type UserExistsOutput = InferContractRouterOutputs<typeof userExistsContract>;

export type UserSoftDeleteInput = InferContractRouterInputs<typeof userSoftDeleteContract>;
export type UserSoftDeleteOutput = InferContractRouterOutputs<typeof userSoftDeleteContract>;

export type UserArchiveInput = InferContractRouterInputs<typeof userArchiveContract>;
export type UserArchiveOutput = InferContractRouterOutputs<typeof userArchiveContract>;

export type UserRestoreInput = InferContractRouterInputs<typeof userRestoreContract>;
export type UserRestoreOutput = InferContractRouterOutputs<typeof userRestoreContract>;

// Batch operations
export type UserBatchCreateInput = InferContractRouterInputs<typeof userBatchCreateContract>;
export type UserBatchCreateOutput = InferContractRouterOutputs<typeof userBatchCreateContract>;

export type UserBatchDeleteInput = InferContractRouterInputs<typeof userBatchDeleteContract>;
export type UserBatchDeleteOutput = InferContractRouterOutputs<typeof userBatchDeleteContract>;

export type UserBatchReadInput = InferContractRouterInputs<typeof userBatchReadContract>;
export type UserBatchReadOutput = InferContractRouterOutputs<typeof userBatchReadContract>;

export type UserBatchUpdateInput = InferContractRouterInputs<typeof userBatchUpdateContract>;
export type UserBatchUpdateOutput = InferContractRouterOutputs<typeof userBatchUpdateContract>;

// Streaming operations
export type UserStreamingListInput = InferContractRouterInputs<typeof userStreamingListContract>;
export type UserStreamingListOutput = InferContractRouterOutputs<typeof userStreamingListContract>;

export type UserStreamingReadInput = InferContractRouterInputs<typeof userStreamingReadContract>;
export type UserStreamingReadOutput = InferContractRouterOutputs<typeof userStreamingReadContract>;

export type UserStreamingSearchInput = InferContractRouterInputs<typeof userStreamingSearchContract>;
export type UserStreamingSearchOutput = InferContractRouterOutputs<typeof userStreamingSearchContract>;

// Customized contracts
export type UserCreateMinimalInput = InferContractRouterInputs<typeof userCreateMinimalContract>;
export type UserCreateMinimalOutput = InferContractRouterOutputs<typeof userCreateMinimalContract>;

export type UserUpdatePartialInput = InferContractRouterInputs<typeof userUpdatePartialContract>;
export type UserUpdatePartialOutput = InferContractRouterOutputs<typeof userUpdatePartialContract>;

export type UserListCustomPathInput = InferContractRouterInputs<typeof userListWithCustomPathContract>;
export type UserListCustomPathOutput = InferContractRouterOutputs<typeof userListWithCustomPathContract>;

export type UserPublicProfileInput = InferContractRouterInputs<typeof userPublicProfileContract>;
export type UserPublicProfileOutput = InferContractRouterOutputs<typeof userPublicProfileContract>;

export type UserCreateWithRoleInput = InferContractRouterInputs<typeof userCreateWithRoleContract>;
export type UserCreateWithRoleOutput = InferContractRouterOutputs<typeof userCreateWithRoleContract>;

// ============================================================================
// CONTRACT STRUCTURE DIAGNOSTICS
// ============================================================================

// Extract the raw contract structure to see what's in ~orpc
export type UserReadContractRaw = typeof userReadContract;
export type UserReadContractOrpc = UserReadContractRaw extends { '~orpc': infer T } ? T : 'NO_ORPC';
export type UserReadContractInputSchema = UserReadContractRaw extends { '~orpc': { inputSchema: infer I } } ? I : 'NO_INPUT_SCHEMA';
export type UserReadContractOutputSchema = UserReadContractRaw extends { '~orpc': { outputSchema: infer O } } ? O : 'NO_OUTPUT_SCHEMA';

export type UserCreateContractRaw = typeof userCreateContract;
export type UserCreateContractOrpc = UserCreateContractRaw extends { '~orpc': infer T } ? T : 'NO_ORPC';
export type UserCreateContractInputSchema = UserCreateContractRaw extends { '~orpc': { inputSchema: infer I } } ? I : 'NO_INPUT_SCHEMA';

// ============================================================================
// ISSUE INVESTIGATION
// ============================================================================

// Check if the problem is in how methods return types
export type DiagnosticReadMethod = ReturnType<ReturnType<typeof import('../../../standard/standard-operations').standard>['read']>;
export type DiagnosticReadMethodBuild = ReturnType<DiagnosticReadMethod['build']>;
