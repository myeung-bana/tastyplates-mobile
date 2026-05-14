import { useAuthenticationStatus, useUserData } from '@nhost/react'
import type { User } from '@nhost/nhost-js'

export interface AuthResult {
  isAuthenticated: boolean
  user: User | null
  /** Alias for user — use when you specifically need the auth identity. */
  authUser: User | null
  loading: boolean
}

/**
 * Lightweight auth guard hook.
 *
 * Use for simple isAuthenticated checks and redirects.
 * For full user data access use useSession().
 */
export function useAuth(): AuthResult {
  const { isAuthenticated, isLoading } = useAuthenticationStatus()
  const user = useUserData()

  return {
    isAuthenticated,
    user: user ?? null,
    authUser: user ?? null,
    loading: isLoading,
  }
}
