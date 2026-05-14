import { useAuthenticationStatus, useUserData } from '@nhost/react'
import type { User } from '@nhost/nhost-js'

export interface SessionResult {
  /** Nhost user data (profile fields). */
  user: User | null
  /** Alias for user — use when you specifically need the auth identity. */
  authUser: User | null
  /** True while the auth state is being resolved. */
  loading: boolean
  /** True once auth is definitively resolved (authenticated or not). */
  isReady: boolean
}

/**
 * Canonical auth access hook.
 *
 * All components that need the current user should call this.
 * Never call nhost.auth.* directly from feature components.
 */
export function useSession(): SessionResult {
  const { isLoading } = useAuthenticationStatus()
  const user = useUserData()

  return {
    user: user ?? null,
    authUser: user ?? null,
    loading: isLoading,
    isReady: !isLoading,
  }
}
