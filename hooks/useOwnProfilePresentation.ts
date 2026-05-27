import { useCallback, useEffect, useState } from 'react'

import { useNhostSession } from '@/hooks/useNhostSession'
import {
  fetchRestaurantUserById,
  normalizeLegacyProfileAvatar,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'

const ruCache = new Map<string, RestaurantUserRow | null>()
const inflight = new Map<string, Promise<RestaurantUserRow | null>>()

async function loadRestaurantUserRow(userId: string): Promise<RestaurantUserRow | null> {
  if (ruCache.has(userId)) return ruCache.get(userId) ?? null

  let pending = inflight.get(userId)
  if (!pending) {
    pending = fetchRestaurantUserById(userId)
      .then((row) => {
        ruCache.set(userId, row)
        inflight.delete(userId)
        return row
      })
      .catch(() => {
        ruCache.set(userId, null)
        inflight.delete(userId)
        return null
      })
    inflight.set(userId, pending)
  }
  return pending
}

/** Call after profile edit so top nav and profile screen pick up a new avatar. */
export function invalidateOwnRestaurantUserCache(userId?: string): void {
  if (userId) {
    ruCache.delete(userId)
    inflight.delete(userId)
  } else {
    ruCache.clear()
    inflight.clear()
  }
}

export type OwnProfilePresentation = {
  authUserId: string | undefined
  displayName: string
  /** Same resolution as {@link ProfileSignedInView} (Nhost + restaurant_users legacy). */
  avatarUrl: string | null
  restaurantUser: RestaurantUserRow | null
  loading: boolean
  refreshRestaurantUser: () => Promise<void>
}

/**
 * Signed-in user's display name and avatar for nav, profile header, etc.
 */
export function useOwnProfilePresentation(): OwnProfilePresentation {
  const { authUser, profile, loading: sessionLoading } = useNhostSession()
  const userId = authUser?.id
  const [ru, setRu] = useState<RestaurantUserRow | null>(null)
  const [ruLoading, setRuLoading] = useState(false)

  const refreshRestaurantUser = useCallback(async () => {
    if (!userId) {
      setRu(null)
      return
    }
    invalidateOwnRestaurantUserCache(userId)
    setRuLoading(true)
    try {
      const row = await loadRestaurantUserRow(userId)
      setRu(row)
    } catch {
      setRu(null)
    } finally {
      setRuLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setRu(null)
      setRuLoading(false)
      return
    }
    let cancelled = false
    setRuLoading(true)
    void (async () => {
      try {
        const row = await loadRestaurantUserRow(userId)
        if (!cancelled) setRu(row)
      } catch {
        if (!cancelled) setRu(null)
      } finally {
        if (!cancelled) setRuLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const displayName =
    profile?.displayName?.trim() ||
    ru?.display_name?.trim() ||
    authUser?.displayName?.trim() ||
    'Member'

  const avatarUrl =
    profile?.avatarUrl?.trim() ||
    normalizeLegacyProfileAvatar(ru?.avatarUrl, ru?.profile_image) ||
    null

  return {
    authUserId: userId,
    displayName,
    avatarUrl,
    restaurantUser: ru,
    loading: sessionLoading || ruLoading,
    refreshRestaurantUser,
  }
}
