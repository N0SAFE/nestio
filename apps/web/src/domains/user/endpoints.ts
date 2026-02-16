import { orpc } from '@/lib/orpc'

/**
 * User domain endpoints
 * 
 * All user endpoints use ORPC contracts directly (no custom contracts needed).
 * ORPC provides full CRUD operations with type safety.
 */
export const userEndpoints = {
  /**
   * List users with pagination/filtering/sorting
   */
  list: orpc.user.list,
  
  /**
   * Find a single user by ID
   */
  findById: orpc.user.findById,
  
  /**
   * Create a new user
   */
  create: orpc.user.create,
  
  /**
   * Update an existing user
   */
  update: orpc.user.update,
  
  /**
   * Delete a user
   */
  delete: orpc.user.delete,
  
  /**
   * Check if email is available
   */
  checkEmail: orpc.user.checkEmail,
  
  /**
   * Get user count statistics
   */
  count: orpc.user.count,
} as const

export type UserEndpoints = typeof userEndpoints

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * User domain query keys for cache management
 * 
 * Uses simple array-based keys compatible with TanStack Query's prefix matching.
 * 
 * @example Invalidate all user queries
 * queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
 * 
 * @example Invalidate specific user
 * queryClient.invalidateQueries({ queryKey: userQueryKeys.findById({ id: userId }) })
 */
export const userQueryKeys = {
  /** Base key for all user queries */
  all: ['user'] as const,
  
  /** User list base key */
  list: (input?: Record<string, unknown>) => 
    ['user', 'list', input] as const,
  
  /** User by ID query key */
  findById: (input: { params: { id: string } }) => 
    ['user', 'findById', input] as const,
  
  /** User count query key */
  count: () => 
    ['user', 'count'] as const,
  
  /** Check email query key */
  checkEmail: (input: { body: { email: string } }) => 
    ['user', 'checkEmail', input] as const,
}