import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  activityRowKey,
  buildActivityFeedSections,
  hasOlderActivities,
  mergeFollowingActivities,
  shouldShowEarlierActivityCta,
} from '@/lib/followingFeedGrouping'
import {
  fetchFollowingFeed,
  type FollowingFeedActivity,
} from '@/services/followingFeedService'

const DEFAULT_PAGE_SIZE = 40

export function useFollowingFeed(userId: string | null, pageSize = DEFAULT_PAGE_SIZE) {
  const [activities, setActivities] = useState<FollowingFeedActivity[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [expandedOlder, setExpandedOlder] = useState(false)

  const loadPage = useCallback(
    async (offset: number, mode: 'replace' | 'append') => {
      if (!userId) return

      const result = await fetchFollowingFeed(userId, {
        limit: pageSize,
        offset,
      })

      setActivities((prev) =>
        mode === 'replace'
          ? result.activities
          : mergeFollowingActivities(prev, result.activities),
      )
      setHasMore(result.meta.hasMore)
      setError(null)
    },
    [userId, pageSize],
  )

  useEffect(() => {
    if (!userId) {
      setActivities([])
      setHasMore(false)
      setError(null)
      setExpandedOlder(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setExpandedOlder(false)

    void (async () => {
      try {
        await loadPage(0, 'replace')
      } catch {
        if (!cancelled) {
          setActivities([])
          setHasMore(false)
          setError('Could not load your following feed.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, loadPage])

  const refresh = useCallback(async () => {
    if (!userId) return
    setRefreshing(true)
    setExpandedOlder(false)
    try {
      await loadPage(0, 'replace')
    } catch {
      setError('Could not load your following feed.')
    } finally {
      setRefreshing(false)
    }
  }, [userId, loadPage])

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || loadingMore || loading || error) return

    setLoadingMore(true)
    try {
      await loadPage(activities.length, 'append')
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [userId, hasMore, loadingMore, loading, error, loadPage, activities.length])

  const showEarlierActivity = useCallback(async () => {
    setExpandedOlder(true)
    const olderAlreadyLoaded = hasOlderActivities(activities)
    if (!olderAlreadyLoaded && hasMore) {
      await loadMore()
    }
  }, [activities, hasMore, loadMore])

  const sections = useMemo(
    () => buildActivityFeedSections(activities, expandedOlder),
    [activities, expandedOlder],
  )

  const showEarlierCta = shouldShowEarlierActivityCta(activities, expandedOlder, hasMore)

  const showLoadMoreCta = expandedOlder && hasMore

  return {
    activities,
    sections,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    expandedOlder,
    showEarlierCta,
    showLoadMoreCta,
    refresh,
    loadMore,
    showEarlierActivity,
    keyExtractor: activityRowKey,
  }
}
