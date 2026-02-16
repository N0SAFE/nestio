/**
 * Push Notification Domain - Client Hooks
 * 
 * React hooks for web push notifications with automatic cache invalidation
 */

'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { pushEndpoints } from './endpoints'
import { pushInvalidations } from './invalidations'
import { wrapWithInvalidations } from '../shared/helpers'

// Wrap endpoints with automatic invalidation
const enhancedPush = wrapWithInvalidations(pushEndpoints, pushInvalidations)

// ============================================================================
// BROWSER API HOOKS - Client-side push notification support detection
// ============================================================================

/**
 * Hook to check if push notifications are supported in the browser.
 * Checks for Service Worker, PushManager, and Notification API support.
 * @returns true if push notifications are fully supported
 * @example const isSupported = usePushNotificationSupport()
 */
export function usePushNotificationSupport(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Hook to get the current notification permission state.
 * @returns 'granted', 'denied', 'default', or 'unsupported'
 * @example const permission = useNotificationPermission()
 */
export function useNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

// ============================================================================
// QUERY HOOKS (Read Operations)
// ============================================================================

/**
 * Get VAPID public key for push subscriptions
 */
export function usePushPublicKey() {
  return useQuery(pushEndpoints.getPublicKey.queryOptions())
}

/**
 * Get list of push subscriptions
 */
export function usePushSubscriptions() {
  return useQuery(pushEndpoints.getSubscriptions.queryOptions())
}

/**
 * Get push notification statistics
 */
export function usePushStats() {
  return useQuery(pushEndpoints.getStats.queryOptions())
}

// ============================================================================
// MUTATION HOOKS (Write Operations)
// ============================================================================

/**
 * Subscribe to push notifications
 * Invalidates subscriptions list after subscribing
 */
export function usePushSubscribe() {
  return useMutation(
    pushEndpoints.subscribe.mutationOptions({
      onSuccess: enhancedPush.subscribe.withInvalidationOnSuccess(),
    }),
  )
}

/**
 * Unsubscribe from push notifications
 * Invalidates subscriptions list after unsubscribing
 */
export function usePushUnsubscribe() {
  return useMutation(
    pushEndpoints.unsubscribe.mutationOptions({
      onSuccess: enhancedPush.unsubscribe.withInvalidationOnSuccess(),
    }),
  )
}

/**
 * Send test push notification
 */
export function useSendTestNotification() {
  return useMutation(pushEndpoints.sendTestNotification.mutationOptions())
}

// ============================================================================
// COMPOSITE HOOKS
// ============================================================================

/**
 * Get all push notification mutations in one hook
 */
export function usePushActions() {
  const subscribe = usePushSubscribe()
  const unsubscribe = usePushUnsubscribe()
  const sendTest = useSendTestNotification()

  return {
    subscribe,
    unsubscribe,
    sendTest,
    
    isLoading: {
      subscribe: subscribe.isPending,
      unsubscribe: unsubscribe.isPending,
      sendTest: sendTest.isPending,
    },
    
    errors: {
      subscribe: subscribe.error,
      unsubscribe: unsubscribe.error,
      sendTest: sendTest.error,
    },
  }
}

/**
 * Combined hook for complete push notification management
 * Provides a complete interface for push notification features.
 * @example const push = usePushNotifications()
 */
export function usePushNotifications() {
  const isSupported = usePushNotificationSupport()
  const permission = useNotificationPermission()
  const publicKey = usePushPublicKey()
  const subscriptions = usePushSubscriptions()
  const stats = usePushStats()
  const subscribe = usePushSubscribe()
  const unsubscribe = usePushUnsubscribe()
  const sendTest = useSendTestNotification()

  return {
    // Browser API state
    isSupported,
    permission,
    
    // Server hooks - Compatible with legacy API
    publicKey,
    subscriptions,
    stats,
    subscribe,
    unsubscribe,
    sendTest,
  }
}
