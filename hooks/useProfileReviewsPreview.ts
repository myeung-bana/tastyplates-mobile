import { useCallback, useEffect, useState } from 'react'

import {
  fetchUserReviews,
  PROFILE_REVIEWS_PREVIEW_LIMIT,
} from '@/services/profileUserReviewsService'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

export function useProfileReviewsPreview(userId: string | null | undefined) {
  const [reviews, setReviews] = useState<TrendingReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(userId))

  const refresh = useCallback(async () => {
    if (!userId) {
      setReviews([])
      setTotal(0)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchUserReviews(userId, {
        limit: PROFILE_REVIEWS_PREVIEW_LIMIT,
        offset: 0,
      })
      setReviews(result.reviews)
      setTotal(result.meta.total)
      setError(null)
    } catch (e) {
      if (__DEV__) console.warn('[useProfileReviewsPreview] load failed', e)
      setReviews([])
      setTotal(0)
      setError('Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { reviews, total, error, loading, refresh }
}
