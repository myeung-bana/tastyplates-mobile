import { useCallback, useEffect, useState } from 'react'

import {
  checkFollowStatus,
  followRestaurantUser,
  unfollowRestaurantUser,
} from '@/services/followUserService'

export function useFollowTarget(
  restaurantUserId: string | undefined,
  viewerUserId: string | undefined,
  disabled: boolean,
): {
  following: boolean
  loading: boolean
  toggleFollowing: () => Promise<void>
} {
  const [following, setFollowing] = useState(false)
  const [loadingCheck, setLoadingCheck] = useState(true)
  const [busy, setBusy] = useState(false)

  const self = viewerUserId != null && restaurantUserId === viewerUserId

  useEffect(() => {
    if (disabled || !restaurantUserId || !viewerUserId || self) {
      setFollowing(false)
      setLoadingCheck(false)
      return
    }
    let cancelled = false
    setLoadingCheck(true)
    void (async () => {
      try {
        const yes = await checkFollowStatus(restaurantUserId)
        if (!cancelled) setFollowing(yes)
      } catch {
        if (!cancelled) setFollowing(false)
      } finally {
        if (!cancelled) setLoadingCheck(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [disabled, restaurantUserId, viewerUserId, self])

  const toggleFollowing = useCallback(async () => {
    if (
      disabled ||
      !restaurantUserId ||
      !viewerUserId ||
      self ||
      loadingCheck ||
      busy
    ) {
      return
    }
    setBusy(true)
    const wentTo = following
    setFollowing(!wentTo)
    try {
      if (wentTo) await unfollowRestaurantUser(restaurantUserId)
      else await followRestaurantUser(restaurantUserId)
    } catch {
      setFollowing(wentTo)
    } finally {
      setBusy(false)
    }
  }, [
    disabled,
    busy,
    following,
    loadingCheck,
    restaurantUserId,
    self,
    viewerUserId,
  ])

  return {
    following,
    loading: loadingCheck || busy,
    toggleFollowing,
  }
}
