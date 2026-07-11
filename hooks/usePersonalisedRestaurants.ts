import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { LocationCoordinates } from '@/constants/locations'
import { resolveTrustSet } from '@/lib/cuisineTaxonomy'
import { expandCategoryParamToSlugs, isCategoryFilterActive, isNoCategoryFilter } from '@/lib/categorySearch'
import { googleKeywordForCategory, googleKeywordForCuisine } from '@/lib/restaurantDiscoveryHelpers'
import {
  CITY_SEARCH_RADIUS_KM,
  CITY_SEARCH_RADIUS_METERS,
  geoQueryFromCityCenter,
  isWithinRadiusKm,
} from '@/lib/geoUtils'
import {
  getNearbyRestaurants,
  isRestaurantLikeGooglePlace,
  type NearbyPlaceRow,
} from '@/lib/googlePlaces'
import { hybridSearch } from '@/lib/hybridSearch'
import {
  expandCuisineParamToSlugs,
  isCuisineFilterActive,
  isNoCuisineFilter,
} from '@/lib/palateSearch'
import {
  GOOGLE_GAP_FILL_MAX,
  GOOGLE_NEARBY_MAX_PAGES,
  GOOGLE_NEARBY_MAX_RESULTS,
  SEARCH_BROWSE_LIMIT,
} from '@/lib/restaurantSearchConfig'
import {
  dedupeRestaurantSearchResults,
  mergeRestaurantResults,
  restaurantSearchResultId,
} from '@/lib/restaurantSearchMerge'
import { sortRestaurantsByPalateMatch } from '@/lib/sortByPalateMatch'
import { useAuth } from '@/hooks/useAuth'
import { useUserPalate } from '@/hooks/useUserPalate'
import {
  getPreferenceStatsForPalates,
  lookupPreferenceStatByUuid,
  type PreferenceStat,
} from '@/services/preferenceStatsService'
import { getRestaurants } from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult } from '@/types/restaurantSearchResult'

const PAGE_SIZE = SEARCH_BROWSE_LIMIT

export interface UsePersonalisedRestaurantsParams {
  cuisineParam: string | null | undefined
  categoryParam: string | null | undefined
  searchQuery: string | undefined
  locationKey: string
  coordinates: LocationCoordinates | null
  cityName: string | undefined
}

export interface UsePersonalisedRestaurantsResult {
  displayRows: RestaurantSearchResult[]
  loading: boolean
  loadingMore: boolean
  refreshing: boolean
  error: string | null
  hasMore: boolean
  isPersonalised: boolean
  trustSet: string[]
  prefStatsLoading: boolean
  prefStatsError: string | null
  getForRestaurantUuid: (restaurantUuid: string | null | undefined) => PreferenceStat | null
  refresh: (options?: { isPullRefresh?: boolean }) => Promise<void>
  loadMore: () => Promise<void>
}

function filterGooglePlacesWithinCityRadiusLocal(
  places: NearbyPlaceRow[],
  center: LocationCoordinates | null,
): NearbyPlaceRow[] {
  const restaurantLike = places.filter((place) =>
    isRestaurantLikeGooglePlace(place.types, place.name),
  )
  if (!center) return restaurantLike
  return restaurantLike.filter((place) => {
    if (place.latitude == null || place.longitude == null) return true
    return isWithinRadiusKm(center, place.latitude, place.longitude, CITY_SEARCH_RADIUS_KM)
  })
}

export function usePersonalisedRestaurants({
  cuisineParam,
  categoryParam,
  searchQuery,
  locationKey,
  coordinates,
  cityName,
}: UsePersonalisedRestaurantsParams): UsePersonalisedRestaurantsResult {
  const { isAuthenticated } = useAuth()
  const { palate: userPalate } = useUserPalate()

  const cuisineSlugs = useMemo(() => {
    if (!cuisineParam || isNoCuisineFilter(cuisineParam)) return undefined
    const expanded = expandCuisineParamToSlugs(cuisineParam)
    return expanded.length > 0 ? expanded : undefined
  }, [cuisineParam])

  const cuisineFilterActive = isCuisineFilterActive(cuisineParam)
  const categoryFilterActive = isCategoryFilterActive(categoryParam)

  const categorySlugs = useMemo(() => {
    if (!categoryParam || isNoCategoryFilter(categoryParam)) return undefined
    const expanded = expandCategoryParamToSlugs(categoryParam)
    return expanded.length > 0 ? expanded : undefined
  }, [categoryParam])

  const geoParams = useMemo(() => geoQueryFromCityCenter(coordinates), [coordinates])

  const trustSet = useMemo(() => {
    if (!isAuthenticated || !userPalate?.length || !cuisineFilterActive) return []
    return resolveTrustSet({ cuisineParam, userPalate })
  }, [cuisineParam, cuisineFilterActive, isAuthenticated, userPalate])

  const isPersonalised = trustSet.length > 0
  const listOrderBy = cuisineFilterActive || categoryFilterActive ? 'rating_desc' : undefined

  const [rows, setRows] = useState<RestaurantSearchResult[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefStats, setPrefStats] = useState<Map<string, PreferenceStat>>(new Map())
  const [prefStatsLoading, setPrefStatsLoading] = useState(false)
  const [prefStatsError, setPrefStatsError] = useState<string | null>(null)

  const loadMoreLockRef = useRef(false)

  const mergeOptions = useMemo(
    () => ({
      targetPageSize: PAGE_SIZE,
      googleLimit: GOOGLE_GAP_FILL_MAX,
    }),
    [],
  )

  useEffect(() => {
    if (!isPersonalised) {
      setPrefStats(new Map())
      setPrefStatsError(null)
      setPrefStatsLoading(false)
      return
    }

    let cancelled = false
    setPrefStatsLoading(true)
    setPrefStatsError(null)

    void getPreferenceStatsForPalates(trustSet)
      .then((map) => {
        if (!cancelled) setPrefStats(map)
      })
      .catch((e) => {
        if (!cancelled) {
          setPrefStats(new Map())
          setPrefStatsError(e instanceof Error ? e.message : 'Failed to load match scores')
        }
      })
      .finally(() => {
        if (!cancelled) setPrefStatsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isPersonalised, trustSet])

  const fetchFirstPage = useCallback(
    async (options?: { isPullRefresh?: boolean }) => {
      const isPull = options?.isPullRefresh ?? false
      if (isPull) {
        setRefreshing(true)
      } else {
        setLoading(true)
        setCursor(null)
      }
      setError(null)

      try {
        if (searchQuery?.trim()) {
          const hybrid = await hybridSearch(searchQuery, locationKey, coordinates, {
            mode: 'browse',
            cuisineSlugs,
            categorySlugs,
            cityName,
          })
          setRows(dedupeRestaurantSearchResults(hybrid.results))
          setCursor(hybrid.cursor)
          setHasMore(hybrid.hasMore)
        } else {
          const googleKeyword = cuisineFilterActive
            ? googleKeywordForCuisine(cuisineParam ?? null)
            : categoryFilterActive
              ? googleKeywordForCategory(categoryParam ?? null)
              : null

          const [tpData, googlePlaces] = await Promise.allSettled([
            getRestaurants({
              search: searchQuery,
              limit: PAGE_SIZE,
              cursor: null,
              locationKey,
              order_by: listOrderBy,
              cuisineSlugs,
              categorySlugs,
              ...geoParams,
            }),
            coordinates
              ? getNearbyRestaurants(
                  coordinates,
                  CITY_SEARCH_RADIUS_METERS,
                  googleKeyword,
                  {
                    maxResults: GOOGLE_NEARBY_MAX_RESULTS,
                    maxPages: GOOGLE_NEARBY_MAX_PAGES,
                  },
                )
              : Promise.resolve([]),
          ])

          const tpRows = tpData.status === 'fulfilled' ? (tpData.value.restaurants ?? []) : []
          const googleRows =
            googlePlaces.status === 'fulfilled'
              ? filterGooglePlacesWithinCityRadiusLocal(googlePlaces.value, coordinates)
              : []

          if (tpData.status === 'fulfilled') {
            setCursor(tpData.value.meta.cursor)
            setHasMore(tpData.value.meta.hasMore)
          } else {
            setCursor(null)
            setHasMore(false)
          }

          if (tpData.status === 'rejected' && googleRows.length === 0) {
            throw tpData.reason
          }

          setRows(
            dedupeRestaurantSearchResults(mergeRestaurantResults(tpRows, googleRows, mergeOptions)),
          )
        }
      } catch (e) {
        if (!isPull) {
          setRows([])
          setHasMore(false)
        }
        setError(e instanceof Error ? e.message : 'Failed to load restaurants')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      searchQuery,
      locationKey,
      coordinates,
      cuisineSlugs,
      categorySlugs,
      listOrderBy,
      cuisineFilterActive,
      categoryFilterActive,
      cuisineParam,
      categoryParam,
      mergeOptions,
      geoParams,
      cityName,
    ],
  )

  useEffect(() => {
    void fetchFirstPage()
  }, [fetchFirstPage])

  const loadMore = useCallback(async () => {
    if (loadMoreLockRef.current || !hasMore || loadingMore || loading || !cursor) return
    loadMoreLockRef.current = true
    setLoadingMore(true)
    setError(null)
    try {
      const data = await getRestaurants({
        search: searchQuery,
        limit: PAGE_SIZE,
        cursor,
        locationKey,
        order_by: listOrderBy,
        cuisineSlugs,
        categorySlugs,
        cityName: searchQuery?.trim() ? cityName : undefined,
        ...(searchQuery?.trim() ? {} : geoParams),
      })
      setRows((prev) => {
        const existingIds = new Set(prev.map((r) => restaurantSearchResultId(r)))
        const newTpRows = (data.restaurants ?? []).filter((r) => {
          const id = r.uuid?.trim() || r.slug?.trim() || String(r.id)
          return !existingIds.has(id)
        })
        const fresh = mergeRestaurantResults(newTpRows, [], mergeOptions)
        return dedupeRestaurantSearchResults([...prev, ...fresh])
      })
      setCursor(data.meta.cursor)
      setHasMore(data.meta.hasMore)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      loadMoreLockRef.current = false
      setLoadingMore(false)
    }
  }, [
    cursor,
    hasMore,
    loadingMore,
    loading,
    searchQuery,
    listOrderBy,
    locationKey,
    mergeOptions,
    geoParams,
    cityName,
    cuisineSlugs,
    categorySlugs,
  ])

  const displayRows = useMemo(() => {
    if (!isPersonalised || prefStats.size === 0) return rows
    return sortRestaurantsByPalateMatch(rows, prefStats)
  }, [rows, isPersonalised, prefStats])

  const getForRestaurantUuid = useCallback(
    (restaurantUuid: string | null | undefined): PreferenceStat | null => {
      if (!restaurantUuid?.trim() || !isPersonalised) return null
      return lookupPreferenceStatByUuid(prefStats, restaurantUuid.trim())
    },
    [isPersonalised, prefStats],
  )

  const refresh = useCallback(
    async (options?: { isPullRefresh?: boolean }) => {
      await fetchFirstPage(options)
    },
    [fetchFirstPage],
  )

  return {
    displayRows,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    isPersonalised,
    trustSet,
    prefStatsLoading,
    prefStatsError,
    getForRestaurantUuid,
    refresh,
    loadMore,
  }
}

export function preferenceStatForSearchResult(
  item: RestaurantSearchResult,
  getForRestaurantUuid: (uuid: string | null | undefined) => PreferenceStat | null,
): PreferenceStat | null {
  if (!isTPResult(item)) return null
  return getForRestaurantUuid(item.uuid)
}
