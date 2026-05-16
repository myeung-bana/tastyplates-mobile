import { useCallback, useEffect, useState } from 'react'

import type { OwnProfileStats } from '@/services/profileStatsService'
import { fetchOwnProfileStats } from '@/services/profileStatsService'

const INITIAL: OwnProfileStats = {
  reviews: null,
  wishlist: null,
  checkins: null,
  followers: null,
  following: null,
}

export interface UseOwnProfileStatsResult extends OwnProfileStats {
  loading: boolean
  refresh: () => Promise<void>
}

export function useOwnProfileStats(userId: string | undefined): UseOwnProfileStatsResult {
  const [stats, setStats] = useState<OwnProfileStats>(INITIAL)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) {
      setStats(INITIAL)
      return
    }
    setLoading(true)
    try {
      const next = await fetchOwnProfileStats(userId)
      setStats(next)
    } catch {
      setStats(INITIAL)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...stats, loading, refresh }
}
