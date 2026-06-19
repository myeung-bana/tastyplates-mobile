import { useMemo } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import { palateKeysFromProfile } from '@/lib/profilePalateKeys'

/** Logged-in user's cuisine palate slugs from `user_profiles.palates`. */
export function useUserPalate(): { palate: string[] | null; loading: boolean } {
  const { isAuthenticated } = useAuth()
  const { restaurantUser, loading } = useOwnProfilePresentation()

  const palate = useMemo(() => {
    if (!isAuthenticated) return null
    const keys = palateKeysFromProfile(restaurantUser?.palates)
    return keys.length > 0 ? keys : []
  }, [isAuthenticated, restaurantUser?.palates])

  return {
    palate,
    loading: isAuthenticated ? loading : false,
  }
}
