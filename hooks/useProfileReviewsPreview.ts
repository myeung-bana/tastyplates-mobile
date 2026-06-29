import { useCallback, useEffect, useState } from 'react'
import { useAccessToken } from '@nhost/react'

import {
  fetchUserReviews,
  PROFILE_REVIEWS_PREVIEW_LIMIT,
} from '@/services/profileUserReviewsService'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

export function useProfileReviewsPreview(
  authorId: string | null | undefined,
  options?: { withAuth?: boolean },
) {
  const withAuth = options?.withAuth ?? false
  const accessToken = useAccessToken()
  const authTokenReady = !withAuth || Boolean(accessToken)

  const [reviews, setReviews] = useState<TrendingReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(authorId) && authTokenReady)

  const refresh = useCallback(async () => {
    if (!authorId) {
      setReviews([])
      setTotal(0)
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
      const result = await fetchUserReviews(authorId, {
        limit: PROFILE_REVIEWS_PREVIEW_LIMIT,
        offset: 0,
        withAuth,
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
  }, [authorId, authTokenReady, withAuth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { reviews, total, error, loading, refresh }
}
