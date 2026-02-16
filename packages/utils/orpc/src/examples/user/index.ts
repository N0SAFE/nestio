/**
 * ORPC User Module - Complete Feature Example
 *
 * This module demonstrates a complete implementation of a user management feature
 * using ORPC utilities including:
 * - Entity schema with Zod validation
 * - Standard CRUD contracts (list, read, create, update, delete)
 * - Batch operations (batchCreate, batchRead, batchUpdate, batchDelete)
 * - Streaming operations (streamList, streamRead, streamSearch)
 * - Customized operations (using builder extensions: pick, omit, partial, extend)
 * - React Query hooks with automatic invalidation
 *
 * @example
 * ```typescript
 * // Import everything
 * import { userContract, userHooks, userSchema } from './user';
 *
 * // Use hooks in components
 * const { data } = userHooks.useList({ pagination: { page: 1, limit: 10 } });
 * ```
 */

// ============================================================================
// Entity Exports
// ============================================================================
export {
  userSchema,
  userCreateSchema,
  userUpdateSchema,
  USER_ROLES,
  USER_STATUS,
} from './entity';

export type {
  User,
  UserCreate,
  UserUpdate,
  UserRole,
  UserStatus,
} from './entity';

// ============================================================================
// Contract Exports
// ============================================================================

// All operations (standard + customized via builder extensions)
export {
  // Standard CRUD
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
  // Batch operations
  userBatchCreateContract,
  userBatchDeleteContract,
  userBatchReadContract,
  userBatchUpdateContract,
  // Streaming operations
  userStreamingListContract,
  userStreamingReadContract,
  userStreamingSearchContract,
  // Customized operations (using builder extensions)
  userCreateMinimalContract,
  userUpdatePartialContract,
  userListWithCustomPathContract,
  userPublicProfileContract,
  userCreateWithRoleContract,
} from './contracts/standard';

// Combined router contract
export { userContract, userContractNested } from './contracts';

// ============================================================================
// Hook Exports
// ============================================================================
export {
  // Main hooks object (use userHooks.useList, userHooks.useCreate, etc.)
  userHooks,
  // Invalidation configuration
  userInvalidationRules,
  // Query utilities
  userQueryKeys,
  userOptimisticUpdates,
  userPrefetch,
} from './hooks';

// ============================================================================
// Type-only Exports (for TypeScript consumers)
// ============================================================================
export type { UserHooks, UserQueryKeys, UserInvalidationRules } from './hooks';
