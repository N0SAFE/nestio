/**
 * User Module - React Query Hooks Generation
 *
 * This file demonstrates how to generate type-safe React Query hooks
 * from ORPC contracts using the createRouterHooks utility.
 *
 * Features demonstrated:
 * - Basic hook generation from router contracts
 * - Invalidation patterns with defineInvalidations
 * - Query key management and cache coordination
 *
 * NOTE: This is a documentation/example file showing the patterns.
 * In a real application, you would import from @tanstack/react-query.
 *
 * @example
 * ```tsx
 * import { userHooks } from './hooks';
 *
 * function UsersPage() {
 *   const { data, isLoading } = userHooks.useList({ pagination: { page: 1, limit: 10 } });
 *   const createMutation = userHooks.useCreate();
 *
 *   return <UserList users={data?.items} />;
 * }
 * ```
 */

import type { QueryClient } from '@tanstack/react-query';
import { createRouterHooks, defineInvalidations } from '../../../hooks';
import { userContract } from '../contracts';
import type { User } from '../entity';

// =============================================================================
// SETUP: QueryClient Provider
// =============================================================================

/**
 * In a real application, useQueryClient comes from @tanstack/react-query.
 * This example shows the configuration pattern.
 */
const mockQueryClient = {} as QueryClient;
const useQueryClient = () => mockQueryClient;

// =============================================================================
// INVALIDATION CONFIGURATION
// =============================================================================

/**
 * Define invalidation rules for the user module
 *
 * This configures which queries should be invalidated when mutations occur.
 * The patterns support:
 * - Exact query key matching
 * - Prefix-based matching for related queries
 * - Conditional invalidation based on mutation results
 */
export const userInvalidationRules = defineInvalidations(userContract, {
  // When a user is created, invalidate the list and count
  create: {
    invalidates: ['list', 'count'],
  },

  // When a user is updated, invalidate that specific user and the list
  update: {
    invalidates: ['list', 'read'],
  },

  // When a user is deleted, invalidate everything related
  delete: {
    invalidates: ['list', 'count', 'read', 'exists'],
  },

  // Soft delete operations invalidate list and read
  softDelete: {
    invalidates: ['list', 'read', 'count'],
  },

  archive: {
    invalidates: ['list', 'read', 'count'],
  },

  restore: {
    invalidates: ['list', 'read', 'count'],
  },

  // Batch operations invalidate multiple queries
  batchCreate: {
    invalidates: ['list', 'count'],
  },

  batchDelete: {
    invalidates: ['list', 'count', 'read'],
  },

  batchUpdate: {
    invalidates: ['list', 'read'],
  },
});

// =============================================================================
// HOOKS GENERATION
// =============================================================================

/**
 * User hooks with automatic cache invalidation
 *
 * createRouterHooks generates hooks for all contract operations.
 * The generated hooks automatically handle:
 * - Query/Mutation distinction based on HTTP method
 * - Type-safe input/output
 * - Query key generation
 * - Cache invalidation on mutations
 *
 * @example Usage in components:
 * ```tsx
 * function UserList() {
 *   // Query hook - for GET operations
 *   const { data, isLoading } = userHooks.useList({
 *     pagination: { page: 1, limit: 10 }
 *   });
 *
 *   // Mutation hook - for POST/PUT/DELETE operations
 *   const createMutation = userHooks.useCreate();
 *
 *   const handleCreate = async (userData: UserCreate) => {
 *     await createMutation.mutateAsync(userData);
 *     // List is automatically invalidated due to invalidation rules
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export const userHooks = createRouterHooks(userContract, {
  useQueryClient,
  invalidations: userInvalidationRules,
});

// =============================================================================
// QUERY KEY UTILITIES
// =============================================================================

/**
 * Query key factory for manual cache manipulation
 *
 * Use these when you need direct access to query keys for:
 * - Manual cache updates
 * - Optimistic updates
 * - Cache prefetching
 * - Custom invalidation logic
 */
export const userQueryKeys = {
  /** Base key for all user queries */
  all: ['users'] as const,

  /** Key for user list queries */
  lists: () => [...userQueryKeys.all, 'list'] as const,

  /** Key for specific list with filters */
  list: (filters: Record<string, unknown>) =>
    [...userQueryKeys.lists(), filters] as const,

  /** Key for user detail queries */
  details: () => [...userQueryKeys.all, 'detail'] as const,

  /** Key for specific user */
  detail: (id: string) => [...userQueryKeys.details(), id] as const,

  /** Key for user count queries */
  count: (filters?: Record<string, unknown>) =>
    [...userQueryKeys.all, 'count', filters ?? {}] as const,
};

// =============================================================================
// OPTIMISTIC UPDATE HELPERS
// =============================================================================

/**
 * Optimistic update utilities for user operations
 *
 * These helpers make it easy to implement optimistic updates
 * for a better user experience.
 *
 * @example
 * ```tsx
 * const createMutation = userHooks.useCreate({
 *   onMutate: async (newUser) => {
 *     // Cancel outgoing queries
 *     await queryClient.cancelQueries({ queryKey: userQueryKeys.lists() });
 *
 *     // Snapshot previous value
 *     const previous = queryClient.getQueryData(userQueryKeys.lists());
 *
 *     // Optimistically add new user
 *     userOptimisticUpdates.addToList(queryClient, {
 *       id: 'temp-id',
 *       ...newUser,
 *     });
 *
 *     return { previous };
 *   },
 *   onError: (_, __, context) => {
 *     // Rollback on error
 *     if (context?.previous) {
 *       queryClient.setQueryData(userQueryKeys.lists(), context.previous);
 *     }
 *   },
 * });
 * ```
 */
export const userOptimisticUpdates = {
  /**
   * Optimistically add a user to the list cache
   */
  addToList: (queryClient: QueryClient, newUser: User) => {
    queryClient.setQueriesData<{ items: User[] }>(
      { queryKey: userQueryKeys.lists() },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          items: [newUser, ...old.items],
        };
      }
    );
  },

  /**
   * Optimistically update a user in the cache
   */
  updateInCache: (
    queryClient: QueryClient,
    userId: string,
    updates: Partial<User>
  ) => {
    // Update in detail cache
    queryClient.setQueryData<User>(userQueryKeys.detail(userId), (old) => {
      if (!old) return old;
      return { ...old, ...updates };
    });

    // Update in list caches
    queryClient.setQueriesData<{ items: User[] }>(
      { queryKey: userQueryKeys.lists() },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((user) =>
            user.id === userId ? { ...user, ...updates } : user
          ),
        };
      }
    );
  },

  /**
   * Optimistically remove a user from caches
   */
  removeFromCache: (queryClient: QueryClient, userId: string) => {
    // Remove from detail cache
    queryClient.removeQueries({ queryKey: userQueryKeys.detail(userId) });

    // Remove from list caches
    queryClient.setQueriesData<{ items: User[] }>(
      { queryKey: userQueryKeys.lists() },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((user) => user.id !== userId),
        };
      }
    );
  },
};

// =============================================================================
// PREFETCH UTILITIES
// =============================================================================

/**
 * Prefetch utilities for preloading user data
 *
 * Use these for:
 * - Server-side rendering (SSR)
 * - Route prefetching
 * - Hover prefetching
 *
 * @example
 * ```tsx
 * // In getServerSideProps (Next.js)
 * export async function getServerSideProps() {
 *   const queryClient = new QueryClient();
 *   await userPrefetch.list(queryClient, { pagination: { page: 1, limit: 10 } });
 *   return {
 *     props: { dehydratedState: dehydrate(queryClient) },
 *   };
 * }
 * ```
 */
export const userPrefetch = {
  /**
   * Prefetch user list for initial page load
   */
  list: async (
    queryClient: QueryClient,
    filters: { pagination?: { page: number; limit: number } } = {}
  ) => {
    await queryClient.prefetchQuery({
      queryKey: userQueryKeys.list(filters),
      // queryFn would be provided by the ORPC client
      queryFn: () => Promise.resolve({ items: [], pagination: { total: 0 } }),
    });
  },

  /**
   * Prefetch user details for a specific user
   */
  detail: async (queryClient: QueryClient, userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: userQueryKeys.detail(userId),
      // queryFn would be provided by the ORPC client
      queryFn: () => Promise.resolve(null as User | null),
    });
  },
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Export inferred types for external use
 */
export type UserHooks = typeof userHooks;
export type UserQueryKeys = typeof userQueryKeys;
export type UserInvalidationRules = typeof userInvalidationRules;
