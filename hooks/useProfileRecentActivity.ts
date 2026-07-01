import { useCallback, useEffect, useState } from 'react'
import { useAccessToken } from '@nhost/react'

import { useSession } from '@/hooks/useSession'
import type { FollowingFeedActivity } from '@/services/followingFeedService'
import {
  fetchProfileUserActivity,
  PROFILE_ACTIVITY_DEFAULT_LIMIT,
} from '@/services/profileUserReviewsService'

export type UseProfileRecentActivityOptions = {
  /** When true, attach Bearer token so the owner sees drafts/pending in review activity rows. */
  withAuth?: boolean
}

export function useProfileRecentActivity(
  userId: string | null | undefined,
  limit = PROFILE_ACTIVITY_DEFAULT_LIMIT,
  options: UseProfileRecentActivityOptions = {},
) {
  const withAuth = options.withAuth ?? false
  const { isReady: authReady } = useSession()
  const accessToken = useAccessToken()
  const authTokenReady = !withAuth || (authReady && Boolean(accessToken))
  const canFetch = Boolean(userId) && authTokenReady

  const [activities, setActivities] = useState<FollowingFeedActivity[]>([])
  const [loading, setLoading] = useState(canFetch)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setActivities([])
      setError(null)
      setLoading(false)
      return
    }

    if (!authTokenReady) {
      setLoading(true)
      return
    }

    setLoading(true)
    try {
      const result = await fetchProfileUserActivity(userId, {
        limit,
        offset: 0,
        withAuth,
      })
      setActivities(result.activities)
      setError(null)
    } catch {
      setActivities([])
      setError('Could not load recent activity.')
    } finally {
      setLoading(false)
    }
  }, [authTokenReady, limit, userId, withAuth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { activities, loading, error, refresh }
}
