import { useCallback, useEffect, useState } from 'react'

import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { fetchUserReviews } from '@/services/profileUserReviewsService'

const DEFAULT_PAGE_SIZE = 16

export function usePublicProfileReviewsList(
  authorId: string | null,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const [rows, setRows] = useState<TrendingReviewRow[]>([])
  const [loading, setLoading] = useState(Boolean(authorId))
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const loadPage = useCallback(
    async (nextOffset: number, mode: 'replace' | 'append') => {
      if (!authorId) return

      const result = await fetchUserReviews(authorId, {
        limit: pageSize,
        offset: nextOffset,
      })

      setRows((prev) =>
        mode === 'replace' ? result.reviews : [...prev, ...result.reviews],
      )
      setHasMore(result.meta.hasMore)
      setListError(null)
    },
    [authorId, pageSize],
  )

  useEffect(() => {
    if (!authorId) {
      setRows([])
      setHasMore(false)
      setListError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setListError(null)

    void (async () => {
      try {
        await loadPage(0, 'replace')
      } catch {
        if (!cancelled) {
          setRows([])
          setHasMore(false)
          setListError('Could not load reviews.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authorId, loadPage])

  const loadMore = useCallback(async () => {
    if (!authorId || !hasMore || loadingMore || loading || listError) return

    setLoadingMore(true)
    try {
      await loadPage(rows.length, 'append')
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [authorId, hasMore, loadingMore, loading, listError, loadPage, rows.length])

  const refresh = useCallback(async () => {
    if (!authorId) return
    setRefreshing(true)
    try {
      await loadPage(0, 'replace')
    } catch {
      setListError('Could not load reviews.')
    } finally {
      setRefreshing(false)
    }
  }, [authorId, loadPage])

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
