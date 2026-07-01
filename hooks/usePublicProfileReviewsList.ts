import { useCallback, useEffect, useRef, useState } from 'react'

import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { fetchUserReviews } from '@/services/profileUserReviewsService'

const DEFAULT_PAGE_SIZE = 8

export type UsePublicProfileReviewsListOptions = {
  pageSize?: number
}

function reviewsLoadErrorMessage(error: unknown): string {
  if (__DEV__ && error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Could not load reviews.'
}

export function usePublicProfileReviewsList(
  userId: string | null,
  options: UsePublicProfileReviewsListOptions = {},
) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE

  const [rows, setRows] = useState<TrendingReviewRow[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const didLoadRef = useRef(false)

  const loadPage = useCallback(
    async (nextOffset: number, mode: 'replace' | 'append') => {
      if (!userId) return

      const result = await fetchUserReviews(userId, {
        limit: pageSize,
        offset: nextOffset,
      })

      setRows((prev) =>
        mode === 'replace' ? result.reviews : [...prev, ...result.reviews],
      )
      setHasMore(result.meta.hasMore)
      setListError(null)
    },
    [userId, pageSize],
  )

  useEffect(() => {
    didLoadRef.current = false
    setRows([])
    setHasMore(false)
    setListError(null)
    setLoading(Boolean(userId))
  }, [userId, pageSize])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    if (didLoadRef.current) return

    didLoadRef.current = true
    let cancelled = false
    setLoading(true)
    setListError(null)

    void (async () => {
      try {
        await loadPage(0, 'replace')
      } catch (error) {
        if (__DEV__) {
          console.warn('[usePublicProfileReviewsList] load failed', { userId, error })
        }
        if (!cancelled) {
          setRows([])
          setHasMore(false)
          setListError(reviewsLoadErrorMessage(error))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, loadPage])

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || loadingMore || loading || listError) return

    setLoadingMore(true)
    try {
      await loadPage(rows.length, 'append')
    } catch (error) {
      if (__DEV__) {
        console.warn('[usePublicProfileReviewsList] loadMore failed', error)
      }
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, hasMore, loadingMore, loading, listError, loadPage, rows.length])

  const refresh = useCallback(async () => {
    if (!userId) return
    setRefreshing(true)
    try {
      await loadPage(0, 'replace')
    } catch (error) {
      if (__DEV__) {
        console.warn('[usePublicProfileReviewsList] refresh failed', error)
      }
      setListError(reviewsLoadErrorMessage(error))
    } finally {
      setRefreshing(false)
    }
  }, [userId, loadPage])

  return {
    rows,
    loading,
    refreshing,
    loadingMore,
    listError,
    hasMore,
    loadMore,
    refresh,
  }
}
