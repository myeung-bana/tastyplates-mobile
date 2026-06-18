import { useCallback, useEffect, useState } from 'react'

import {
  fetchUserActivity,
  type FollowingFeedActivity,
} from '@/services/followingFeedService'

export function useProfileRecentActivity(userId: string | null | undefined, limit = 3) {
  const [activities, setActivities] = useState<FollowingFeedActivity[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setActivities([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchUserActivity(userId, { limit, offset: 0 })
      setActivities(result.activities)
      setError(null)
    } catch {
      setActivities([])
      setError('Could not load recent activity.')
    } finally {
      setLoading(false)
    }
  }, [limit, userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { activities, loading, error, refresh }
}
