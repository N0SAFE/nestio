/**
 * User Module - Combined Router Contract
 *
 * This file combines all contracts into a single router.
 * The router provides:
 * - Unified prefix ("/users")
 * - Common tags for OpenAPI documentation
 * - Grouped operations for better organization
 *
 * @example
 * ```typescript
 * // Import the complete router
 * import { userContract } from './contracts';
 *
 * // Or import individual contracts for specific needs
 * import { userListContract, userCreateContract } from './contracts';
 * ```
 */

import { oc } from '@orpc/contract';

// All contracts from standard builder (including customized ones)
import {
  // Core CRUD
  userListContract,
  userReadContract,
  userCreateContract,
  userUpdateContract,
  userDeleteContract,
  userCountContract,
  userExistsContract,
  // Soft Delete & Archive
  userSoftDeleteContract,
  userArchiveContract,
  userRestoreContract,
  // Batch Operations
  userBatchCreateContract,
  userBatchDeleteContract,
  userBatchReadContract,
  userBatchUpdateContract,
  // Streaming Operations
  userStreamingListContract,
  userStreamingReadContract,
  userStreamingSearchContract,
  // Customized Operations (using builder extensions)
  userCreateMinimalContract,
  userUpdatePartialContract,
  userListWithCustomPathContract,
  userPublicProfileContract,
  userCreateWithRoleContract,
  userReadNullableContract,
  userCreateWithLocationContract,
  userReadConditionalContract,
  userUpdateWithEtagContract,
  userSearchPublicContract,
} from './standard';

// Re-export all individual contracts for flexibility
export * from './standard';

/**
 * Complete User Router Contract
 *
 * Combines all user-related operations into a single router with:
 * - "/users" prefix for all routes
 * - "User" tag for OpenAPI documentation
 * - Standard CRUD operations
 * - Customized operations (via builder extensions)
 * - Batch processing capabilities
 * - Real-time streaming support
 */
export const userContract = oc
  .tag('User')
  .prefix('/users')
  .router({
    // ═══════════════════════════════════════════════════════════════════════════
    // STANDARD CRUD OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** List users with pagination, sorting, and filtering */
    list: userListContract,

    /** Get a single user by ID */
    read: userReadContract,

    /** Create a new user */
    create: userCreateContract,

    /** Update an existing user */
    update: userUpdateContract,

    /** Permanently delete a user */
    delete: userDeleteContract,

    /** Count users matching criteria */
    count: userCountContract,

    /** Check if a user exists */
    exists: userExistsContract,

    // ═══════════════════════════════════════════════════════════════════════════
    // SOFT DELETE & ARCHIVE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Soft delete a user (mark as deleted without removing) */
    softDelete: userSoftDeleteContract,

    /** Archive a user (for compliance/retention) */
    archive: userArchiveContract,

    /** Restore a soft-deleted or archived user */
    restore: userRestoreContract,

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Create multiple users in a single request */
    batchCreate: userBatchCreateContract,

    /** Delete multiple users by IDs */
    batchDelete: userBatchDeleteContract,

    /** Read multiple users by IDs */
    batchRead: userBatchReadContract,

    /** Update multiple users in a single request */
    batchUpdate: userBatchUpdateContract,

    // ═══════════════════════════════════════════════════════════════════════════
    // STREAMING OPERATIONS (Server-Sent Events)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Stream paginated user list in real-time */
    streamList: userStreamingListContract,

    /** Stream a single user's updates in real-time */
    streamRead: userStreamingReadContract,

    /** Stream search results as they're found */
    streamSearch: userStreamingSearchContract,

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOMIZED OPERATIONS (using standard builder extensions)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Create with minimal fields (pick only name, email) */
    createMinimal: userCreateMinimalContract,

    /** Update with all fields optional (partial) */
    updatePartial: userUpdatePartialContract,

    /** List with custom path parameter */
    listByOrg: userListWithCustomPathContract,

    /** Get public profile (omit sensitive fields) */
    publicProfile: userPublicProfileContract,

    /** Create with specific role (extend input) */
    createWithRole: userCreateWithRoleContract,

    // ═══════════════════════════════════════════════════════════════════════════
    // ADVANCED OUTPUTBUILDER PATTERNS (Detailed Mode Examples)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Read with nullable output (optional relationship) */
    readNullable: userReadNullableContract,

    /** Create with custom status code and Location header */
    createWithLocation: userCreateWithLocationContract,

    /** Read with conditional response (union of success/error) */
    readConditional: userReadConditionalContract,

    /** Update with ETag header for optimistic locking */
    updateWithEtag: userUpdateWithEtagContract,

    /** Search public data with custom output schema */
    searchPublic: userSearchPublicContract,
  });

/**
 * Type inference for the user contract
 */
export type UserContract = typeof userContract;

/**
 * Nested router example - grouping related operations
 *
 * This pattern is useful for complex modules with many operations
 */
export const userContractNested = oc.tag('User').prefix('/users').router({
  // Standard CRUD in root
  list: userListContract,
  read: userReadContract,
  create: userCreateContract,
  update: userUpdateContract,
  delete: userDeleteContract,

  // Nested batch operations
  batch: oc.prefix('/batch').router({
    create: userBatchCreateContract,
    delete: userBatchDeleteContract,
    read: userBatchReadContract,
    update: userBatchUpdateContract,
  }),

  // Nested streaming operations
  stream: oc.prefix('/stream').router({
    list: userStreamingListContract,
    read: userStreamingReadContract,
    search: userStreamingSearchContract,
  }),
});

export type UserContractNested = typeof userContractNested;
