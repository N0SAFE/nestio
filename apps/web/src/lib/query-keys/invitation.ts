/**
 * @fileoverview Invitation Domain Query Keys
 * 
 * Centralized query keys for invitation-related queries.
 * Reuses invitation domain keys and adds custom keys.
 * 
 * @see apps/web/src/domains/invitation/hooks.ts - Invitation domain hooks
 */

import type { QueryClient } from '@tanstack/react-query'

// ============================================================================
// INVITATION KEYS (Defined locally - matches domain structure)
// ============================================================================

/**
 * Invitation query keys for cache management
 * 
 * Available keys:
 * - invitationKeys.all() - Base key for all invitations
 * - invitationKeys.platformAll() - Base key for platform invitations
 * - invitationKeys.platformList(status?) - Platform invitation list
 * - invitationKeys.organizationPending() - Pending org invitations
 * - invitationKeys.organizationLists() - All org invitation lists
 */
export const invitationKeys = {
  /** All invitation queries - for broad invalidation */
  all: () => ['invitations'] as const,
  
  /** Platform invitation keys */
  platformAll: () => ['invitations', 'platform'] as const,
  platformLists: () => ['invitations', 'platform', 'list'] as const,
  platformList: (status?: 'pending' | 'used' | 'expired') => 
    ['invitations', 'platform', 'list', { status }] as const,
  
  /** Organization invitation keys */
  organizationAll: () => ['invitations', 'organization'] as const,
  organizationLists: () => ['invitations', 'organization', 'list'] as const,
  organizationPending: () => ['invitations', 'organization', 'list', 'pending'] as const,
}

// ============================================================================
// CUSTOM KEYS (Domain-specific extensions)
// ============================================================================

/**
 * Custom invitation query keys for additional invitation queries
 * 
 * @example Invitation analytics
 * ```ts
 * const { data } = useQuery({
 *   queryKey: invitationCustomKeys.analytics(orgId),
 *   queryFn: () => fetchInvitationAnalytics(orgId)
 * })
 * ```
 */
export const invitationCustomKeys = {
  /** Base key for custom invitation queries */
  all: ['invitation', 'custom'] as const,
  
  /** Invitation analytics by organization */
  analytics: (orgId: string, options?: { period?: string }) => 
    [...invitationCustomKeys.all, 'analytics', orgId, options] as const,
  
  /** Invitation history/audit */
  history: (options?: { orgId?: string; userId?: string; limit?: number }) => 
    [...invitationCustomKeys.all, 'history', options] as const,
  
  /** Expired invitations */
  expired: (orgId?: string) => 
    [...invitationCustomKeys.all, 'expired', orgId] as const,
} as const

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Helper functions for common invitation cache invalidation patterns
 * 
 * @example Invalidate all invitation queries
 * ```ts
 * import { invalidateInvitationQueries } from '@/lib/query-keys/invitation'
 * 
 * const handleInvitationSent = () => {
 *   invalidateInvitationQueries.all(queryClient)
 * }
 * ```
 * 
 * @example Invalidate platform invitations
 * ```ts
 * const handlePlatformInvitationAccepted = () => {
 *   invalidateInvitationQueries.platform(queryClient)
 * }
 * ```
 */
export const invalidateInvitationQueries = {
  /** Invalidate all invitation queries (platform + org + custom) */
  all: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: invitationKeys.all() })
    void queryClient.invalidateQueries({ queryKey: invitationCustomKeys.all })
  },
  
  /** Invalidate platform invitations only */
  platform: (queryClient: QueryClient, status?: 'pending' | 'used' | 'expired') => {
    if (status) {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.platformList(status) })
    } else {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.platformAll() })
    }
  },
  
  /** Invalidate organization invitations */
  organization: (queryClient: QueryClient) => {
    void queryClient.invalidateQueries({ queryKey: invitationKeys.organizationPending() })
    void queryClient.invalidateQueries({ queryKey: invitationKeys.organizationLists() })
  },
  
  /** Invalidate invitation analytics */
  analytics: (queryClient: QueryClient, orgId?: string) => {
    if (orgId) {
      void queryClient.invalidateQueries({ queryKey: invitationCustomKeys.analytics(orgId) })
    } else {
      void queryClient.invalidateQueries({ queryKey: [...invitationCustomKeys.all, 'analytics'] })
    }
  },
} as const

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Type for invitation query keys */
export type InvitationQueryKeys = typeof invitationKeys

/** Type for custom invitation query keys */
export type InvitationCustomKeys = typeof invitationCustomKeys

/** Type for invalidation helpers */
export type InvalidateInvitationQueries = typeof invalidateInvitationQueries
