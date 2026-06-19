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
  getPreferenceStatsForPalates,
  lookupPreferenceStatByUuid,
  type PreferenceStat,
} from '@/services/preferenceStatsService'

const SHARED_SCORE_MIN_REVIEWS = 3

export interface UseRestaurantScoresParams {
  restaurantUuid: string | null | undefined
  cuisineParam: string | null | undefined
  enabled?: boolean
}

export interface UseRestaurantScoresResult {
  summary: RatingSummaryRow | null
  searchAvg: number | null
  searchCount: number
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

  const searchPalates = useMemo(() => {
    if (!cuisineFilterActive || !cuisineParam) return []
    if (isPersonalised) return trustSet
    return expandCuisineParamToSlugs(cuisineParam)
  }, [cuisineFilterActive, cuisineParam, isPersonalised, trustSet])

  const [summary, setSummary] = useState<RatingSummaryRow | null>(null)
  const [searchStat, setSearchStat] = useState<PreferenceStat | null>(null)
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

    const sharedPromise =
      isAuthenticated && userPalate?.length
        ? getPreferenceStatsForPalates(userPalate)
        : Promise.resolve(new Map<string, PreferenceStat>())

    void Promise.all([getRatingSummary(uuid), searchPromise, sharedPromise])
      .then(([summaryRow, searchMap, sharedMap]) => {
        if (cancelled) return
        setSummary(summaryRow)
        setSearchStat(lookupPreferenceStatByUuid(searchMap, uuid))
        setSharedStat(lookupPreferenceStatByUuid(sharedMap, uuid))
      })
      .catch((e) => {
        if (cancelled) return
        setSummary(null)
        setSearchStat(null)
        setSharedStat(null)
        setError(e instanceof Error ? e.message : 'Failed to load ratings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, uuid, searchPalates, isAuthenticated, userPalate, reloadToken])

  const sharedCount = sharedStat?.count ?? 0
  const sharedUnlocked = isAuthenticated && sharedCount >= SHARED_SCORE_MIN_REVIEWS

  return {
    summary,
    searchAvg: searchStat?.avg ?? null,
    searchCount: searchStat?.count ?? 0,
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
