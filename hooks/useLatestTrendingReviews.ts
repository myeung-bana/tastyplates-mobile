import { useEffect, useState, useCallback } from 'react'

import { getLatestReviews, type TrendingReviewRow } from '@/services/homeReviewsService'

export interface UseLatestTrendingReviewsResult {
  reviews: TrendingReviewRow[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useLatestTrendingReviews(count: number, refreshNonce = 0): UseLatestTrendingReviewsResult {
  const [reviews, setReviews] = useState<TrendingReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonceLocal, setNonceLocal] = useState(0)

  const reload = useCallback(() => {
    setNonceLocal((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const data = await getLatestReviews(count)
        if (!cancelled) {
          setReviews(data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load reviews')
          setReviews([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [count, refreshNonce, nonceLocal])

  return { reviews, loading, error, reload }
}
