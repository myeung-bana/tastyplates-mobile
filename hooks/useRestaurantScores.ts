import { useCallback, useEffect, useMemo, useState } from 'react'

import { resolveTrustSet } from '@/lib/cuisineTaxonomy'
import {
  expandCuisineParamToSlugs,
  isCuisineFilterActive,
  isNoCuisineFilter,
  readCuisineParam,
} from '@/lib/palateSearch'
import { useAuth } from '@/hooks/useAuth'
import { useUserPalate } from '@/hooks/useUserPalate'
import { getRatingSummary, type RatingSummaryRow } from '@/services/restaurantDetailService'
import {
  getGroupScoresForPalates,
  lookupGroupScoreByUuid,
  type GroupScore,
} from '@/services/groupScoreService'
import {
  getPreferenceStatsForPalates,
  lookupPreferenceStatByUuid,
  type PreferenceStat,
} from '@/services/preferenceStatsService'

const SHARED_SCORE_MIN_REVIEWS = 3
const GROUP_SCORE_MIN_REVIEWS = 3

export type SearchScoreMode = 'none' | 'cuisine_filter' | 'personalised' | 'group'

export interface UseRestaurantScoresParams {
  restaurantUuid: string | null | undefined
  cuisineParam: string | null | undefined
  enabled?: boolean
}

export interface UseRestaurantScoresResult {
  summary: RatingSummaryRow | null
  searchAvg: number | null
  searchCount: number
  searchGroupName: string | null
  searchMode: SearchScoreMode
  searchUnlocked: boolean
  sharedAvg: number | null
  sharedCount: number
  sharedUnlocked: boolean
  isPersonalised: boolean
  trustSet: string[]
  cuisineFilterActive: boolean
  loading: boolean
  error: string | null
  refresh: () => void
}

export function cuisineParamFromRouteParams(params: {
  cuisine?: string | string[]
  palate?: string | string[]
}): string | null {
  const raw = readCuisineParam(params)
  if (isNoCuisineFilter(raw)) return null
  return raw!.trim()
}

export function useRestaurantScores({
  restaurantUuid,
  cuisineParam,
  enabled = true,
}: UseRestaurantScoresParams): UseRestaurantScoresResult {
  const { isAuthenticated } = useAuth()
  const { palate: userPalate } = useUserPalate()

  const cuisineFilterActive = isCuisineFilterActive(cuisineParam)
  const trustSet = useMemo(() => {
    if (!isAuthenticated || !userPalate?.length || !cuisineFilterActive) return []
    return resolveTrustSet({ cuisineParam, userPalate })
  }, [cuisineParam, cuisineFilterActive, isAuthenticated, userPalate])

  const isPersonalised = trustSet.length > 0
  const useGroupScoreFallback =
    isAuthenticated && Boolean(userPalate?.length) && !cuisineFilterActive

  const searchPalates = useMemo(() => {
    if (!cuisineFilterActive || !cuisineParam) return []
    if (isPersonalised) return trustSet
    return expandCuisineParamToSlugs(cuisineParam)
  }, [cuisineFilterActive, cuisineParam, isPersonalised, trustSet])

  const [summary, setSummary] = useState<RatingSummaryRow | null>(null)
  const [searchStat, setSearchStat] = useState<PreferenceStat | null>(null)
  const [groupScore, setGroupScore] = useState<GroupScore | null>(null)
  const [sharedStat, setSharedStat] = useState<PreferenceStat | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refresh = useCallback(() => {
    setReloadToken((t) => t + 1)
  }, [])

  const uuid = restaurantUuid?.trim() ?? ''

  useEffect(() => {
    if (!enabled || !uuid) {
      setSummary(null)
      setSearchStat(null)
      setGroupScore(null)
      setSharedStat(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const searchPromise =
      searchPalates.length > 0
        ? getPreferenceStatsForPalates(searchPalates)
        : Promise.resolve(new Map<string, PreferenceStat>())

    const groupPromise =
      useGroupScoreFallback && userPalate?.length
        ? getGroupScoresForPalates(userPalate, [uuid])
        : Promise.resolve(new Map<string, GroupScore>())

    const sharedPromise =
      isAuthenticated && userPalate?.length
        ? getPreferenceStatsForPalates(userPalate)
        : Promise.resolve(new Map<string, PreferenceStat>())

    void Promise.all([getRatingSummary(uuid), searchPromise, groupPromise, sharedPromise])
      .then(([summaryRow, searchMap, groupMap, sharedMap]) => {
        if (cancelled) return
        setSummary(summaryRow)
        setSearchStat(lookupPreferenceStatByUuid(searchMap, uuid))
        setGroupScore(lookupGroupScoreByUuid(groupMap, uuid))
        setSharedStat(lookupPreferenceStatByUuid(sharedMap, uuid))
      })
      .catch((e) => {
        if (cancelled) return
        setSummary(null)
        setSearchStat(null)
        setGroupScore(null)
        setSharedStat(null)
        setError(e instanceof Error ? e.message : 'Failed to load ratings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    uuid,
    searchPalates,
    useGroupScoreFallback,
    isAuthenticated,
    userPalate,
    reloadToken,
  ])

  const searchMode: SearchScoreMode = useMemo(() => {
    if (searchPalates.length > 0) {
      return isPersonalised ? 'personalised' : 'cuisine_filter'
    }
    if (useGroupScoreFallback) return 'group'
    return 'none'
  }, [searchPalates.length, isPersonalised, useGroupScoreFallback])

  const searchAvg = useMemo(() => {
    if (searchMode === 'group') return groupScore?.avg ?? null
    return searchStat?.avg ?? null
  }, [searchMode, groupScore, searchStat])

  const searchCount = useMemo(() => {
    if (searchMode === 'group') return groupScore?.review_count ?? 0
    return searchStat?.count ?? 0
  }, [searchMode, groupScore, searchStat])

  const searchGroupName = searchMode === 'group' ? (groupScore?.group_name ?? null) : null

  const searchUnlocked = useMemo(() => {
    if (searchMode === 'cuisine_filter' || searchMode === 'personalised') return true
    if (searchMode === 'group') return searchCount >= GROUP_SCORE_MIN_REVIEWS
    return false
  }, [searchMode, searchCount])

  const sharedCount = sharedStat?.count ?? 0
  const sharedUnlocked = isAuthenticated && sharedCount >= SHARED_SCORE_MIN_REVIEWS

  return {
    summary,
    searchAvg,
    searchCount,
    searchGroupName,
    searchMode,
    searchUnlocked,
    sharedAvg: sharedUnlocked ? (sharedStat?.avg ?? null) : null,
    sharedCount,
    sharedUnlocked,
    isPersonalised,
    trustSet,
    cuisineFilterActive,
    loading,
    error,
    refresh,
  }
}
