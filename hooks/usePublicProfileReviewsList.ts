import { useCallback, useEffect, useState } from 'react'
import { useAccessToken } from '@nhost/react'

import { useSession } from '@/hooks/useSession'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { fetchUserReviews } from '@/services/profileUserReviewsService'

const DEFAULT_PAGE_SIZE = 16

export type UsePublicProfileReviewsListOptions = {
  pageSize?: number
  /** When true, attach Bearer token so the owner sees drafts/pending (backend `canReadPrivate`). */
  withAuth?: boolean
}

function reviewsLoadErrorMessage(error: unknown): string {
  if (__DEV__ && error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Could not load reviews.'
}

export function usePublicProfileReviewsList(
  authorId: string | null,
  options: UsePublicProfileReviewsListOptions = {},
) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const withAuth = options.withAuth ?? false
  const { isReady: authReady } = useSession()
  const accessToken = useAccessToken()
  const authTokenReady = !withAuth || (authReady && Boolean(accessToken))
  const canFetch = Boolean(authorId) && authTokenReady

  const [rows, setRows] = useState<TrendingReviewRow[]>([])
  const [loading, setLoading] = useState(canFetch)
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
        withAuth,
      })

      setRows((prev) =>
        mode === 'replace' ? result.reviews : [...prev, ...result.reviews],
      )
      setHasMore(result.meta.hasMore)
      setListError(null)
    },
    [authorId, pageSize, withAuth],
  )

  useEffect(() => {
    if (!authorId) {
      setRows([])
      setHasMore(false)
      setListError(null)
      setLoading(false)
      return
    }

    if (!canFetch) {
      setLoading(true)
      return
    }

    let cancelled = false
    setLoading(true)
    setListError(null)

    void (async () => {
      try {
        await loadPage(0, 'replace')
      } catch (error) {
        if (__DEV__) {
          console.warn('[usePublicProfileReviewsList] load failed', error)
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
  }, [authorId, canFetch, loadPage])

  const loadMore = useCallback(async () => {
    if (!authorId || !hasMore || loadingMore || loading || listError) return

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
  }, [authorId, hasMore, loadingMore, loading, listError, loadPage, rows.length])

  const refresh = useCallback(async () => {
    if (!authorId || !canFetch) return
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
  }, [authorId, canFetch, loadPage])

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
