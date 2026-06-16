import { useCallback, useEffect, useState } from 'react'

import type { TrendingReviewRow } from '@/services/homeReviewsService'
import {
  fetchUserReviews,
  PROFILE_REVIEWS_PREVIEW_LIMIT,
} from '@/services/profileUserReviewsService'

export function useProfileReviewsPreview(authorId: string | null | undefined) {
  const [reviews, setReviews] = useState<TrendingReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(authorId))

  const refresh = useCallback(async () => {
    if (!authorId) {
      setReviews([])
      setTotal(0)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchUserReviews(authorId, {
        limit: PROFILE_REVIEWS_PREVIEW_LIMIT,
        offset: 0,
      })
      setReviews(result.reviews)
      setTotal(result.meta.total)
      setError(null)
    } catch {
      setReviews([])
      setTotal(0)
      setError('Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [authorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { reviews, total, error, loading, refresh }
}
