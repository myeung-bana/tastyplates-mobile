import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet'
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps'
import type { MapPressEvent } from 'react-native-maps'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, router } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import { getRestaurantBrowseCardWidth } from '@/components/restaurant/RestaurantBrowseCardItem'
import { RestaurantMapMarker } from '@/components/restaurant/RestaurantMapMarker'
import { PalateFilterChips } from '@/components/search/PalateFilterChips'
import {
  RestaurantBrowseCardSkeleton,
  RestaurantBrowseSkeletonList,
} from '@/components/ui/Skeleton/RestaurantBrowseCardSkeleton'
import { BRAND_PRIMARY } from '@/constants/brand'
import {
  SCREEN_PLACES_GOOGLE_DETAIL,
  SCREEN_RESTAURANT_DETAIL,
} from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import {
  CITY_SEARCH_RADIUS_KM,
  CITY_SEARCH_RADIUS_METERS,
  geoQueryFromCityCenter,
  isWithinRadiusKm,
  mapRegionForRadiusKm,
} from '@/lib/geoUtils'
import {
  cityNameFromLocation,
  formatRestaurantSearchResultAddress,
} from '@/lib/restaurantDiscoveryHelpers'
import { hybridSearch } from '@/lib/hybridSearch'
import {
  MERGE_GOOGLE_LIMIT_IDLE,
  MERGE_SUPPRESS_TP_COUNT_IDLE,
  SEARCH_BROWSE_LIMIT,
} from '@/lib/restaurantSearchConfig'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { getNearbyRestaurants } from '@/lib/googlePlaces'
import { usePalatePreferenceStats } from '@/hooks/usePalatePreferenceStats'
import { labelForPalateKey } from '@/lib/palateLabels'
import { isNoPalateFilter, isPalateSortActive } from '@/lib/palateSearch'
import { sortRestaurantsByPalateMatch } from '@/lib/sortByPalateMatch'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import {
  mergeRestaurantResults,
  dedupeRestaurantSearchResults,
  restaurantSearchResultCoords,
  restaurantSearchResultId,
} from '@/lib/restaurantSearchMerge'
import {
  getRestaurants,
  normalizeCategoryList,
  normalizeCuisineList,
} from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

const PAGE_SIZE = SEARCH_BROWSE_LIMIT
const ROW_GAP = 12
/** Collapsed — maximizes map for pinch/zoom; shows handle + list header peek. */
const SHEET_MIN = '18%'
/** Mid — browse a few cards without covering most of the map. */
const SHEET_MID = '42%'
const SHEET_EXPANDED = '72%'

function singleParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

function filterGooglePlacesWithinCityRadius(
  places: NearbyPlaceRow[],
  center: { latitude: number; longitude: number } | null,
): NearbyPlaceRow[] {
  if (!center) return places
  return places.filter((place) => {
    if (place.latitude == null || place.longitude == null) return true
    return isWithinRadiusKm(center, place.latitude, place.longitude, CITY_SEARCH_RADIUS_KM)
  })
}

/**
 * Restaurant discovery: hybrid TP + Google search with map + bottom sheet (or FlatList fallback).
 */
export default function RestaurantsScreen() {
  const { width: screenWidth } = useWindowDimensions()
  const { location } = useLocation()
  const locationKey = location.key
  const coordinates = location.coordinates ?? null

  const cardWidth = useMemo(
    () => (screenWidth > 0 ? getRestaurantBrowseCardWidth(screenWidth) : undefined),
    [screenWidth],
  )

  const geoParams = useMemo(() => geoQueryFromCityCenter(coordinates), [coordinates])
  const cityName = useMemo(() => cityNameFromLocation(location), [location.label, location.key])

  const cityMapRegion: Region | undefined = useMemo(() => {
    if (!coordinates) return undefined
    return mapRegionForRadiusKm(coordinates, CITY_SEARCH_RADIUS_KM)
  }, [coordinates?.latitude, coordinates?.longitude])

  const raw = useLocalSearchParams<{
    palate?: string | string[]
    search?: string | string[]
    listing?: string | string[]
  }>()

  const palate = singleParam(raw.palate)
  const search = singleParam(raw.search)
  const listing = singleParam(raw.listing)

  const searchQuery = useMemo(() => {
    const a = search?.trim()
    const b = listing?.trim()
    if (a && b) return `${a} ${b}`.trim()
    return a ?? b ?? undefined
  }, [search, listing])

  const palateSortActive = isPalateSortActive(palate)
  const listOrderBy = palateSortActive ? 'smart' : undefined

  const {
    loading: palateStatsLoading,
    error: palateStatsError,
    statsMap,
    getForRestaurantUuid,
  } = usePalatePreferenceStats(palate)

  const [rows, setRows] = useState<RestaurantSearchResult[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const mapRef = useRef<MapView>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)
  const sheetListRef = useRef<FlatList<RestaurantSearchResult>>(null)
  const loadMoreLockRef = useRef(false)
  /** Skip clearing pin selection while reopening sheet for map pin preview. */
  const pinPreviewSnapRef = useRef(false)
  /** Skip redundant animateToRegion when MapView `initialRegion` already matches. */
  const lastMapRegionKeyRef = useRef<string | null>(null)

  const snapPoints = useMemo(() => [SHEET_MIN, SHEET_MID, SHEET_EXPANDED], [])

  const mergeOptions = useMemo(
    () => ({
      googleLimit: MERGE_GOOGLE_LIMIT_IDLE,
      suppressGoogleWhenTPCount: MERGE_SUPPRESS_TP_COUNT_IDLE,
      palateSlug: palate ?? null,
    }),
    [palate],
  )

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
      setSelectedId(null)

      try {
        if (searchQuery?.trim()) {
          const hybrid = await hybridSearch(searchQuery, locationKey, coordinates, {
            mode: 'browse',
            palateSlug: palate ?? null,
            cityName,
          })
          setRows(dedupeRestaurantSearchResults(hybrid.results))
          setCursor(hybrid.cursor)
          setHasMore(hybrid.hasMore)
        } else {
          const [tpData, googlePlaces] = await Promise.allSettled([
            getRestaurants({
              search: searchQuery,
              limit: PAGE_SIZE,
              cursor: null,
              locationKey,
              order_by: listOrderBy,
              ...geoParams,
            }),
            coordinates
              ? getNearbyRestaurants(coordinates, CITY_SEARCH_RADIUS_METERS)
              : Promise.resolve([]),
          ])

          const tpRows = tpData.status === 'fulfilled' ? (tpData.value.restaurants ?? []) : []
          const googleRows =
            googlePlaces.status === 'fulfilled'
              ? filterGooglePlacesWithinCityRadius(googlePlaces.value, coordinates)
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
    [searchQuery, listOrderBy, locationKey, coordinates, palate, mergeOptions, geoParams, cityName],
  )

  useEffect(() => {
    void fetchFirstPage()
  }, [fetchFirstPage])

  useEffect(() => {
    if (!mapRef.current || !cityMapRegion) return
    const key = `${locationKey}|${cityMapRegion.latitude}|${cityMapRegion.longitude}|${cityMapRegion.latitudeDelta}`
    if (lastMapRegionKeyRef.current === key) return
    const isInitial = lastMapRegionKeyRef.current === null
    lastMapRegionKeyRef.current = key
    if (isInitial) return
    mapRef.current.animateToRegion(cityMapRegion, 400)
  }, [cityMapRegion, locationKey])

  const loadMore = useCallback(async () => {
    if (loadMoreLockRef.current || !hasMore || loadingMore || loading || !cursor) {
      return
    }
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
  ])

  const displayRows = useMemo(() => {
    if (!palateSortActive || !statsMap) return rows
    return sortRestaurantsByPalateMatch(rows, statsMap)
  }, [rows, palateSortActive, statsMap])

  const selectedPinResult = useMemo(() => {
    if (!selectedId) return null
    return displayRows.find((r) => restaurantSearchResultId(r) === selectedId) ?? null
  }, [selectedId, displayRows])

  /** Exclude pinned preview from the scrollable list to avoid duplicate cards. */
  const sheetListData = useMemo(() => {
    if (!selectedId) return displayRows
    return displayRows.filter((r) => restaurantSearchResultId(r) !== selectedId)
  }, [displayRows, selectedId])

  const onRefresh = useCallback(() => {
    void fetchFirstPage({ isPullRefresh: true })
  }, [fetchFirstPage])

  const clearPalate = useCallback(() => {
    router.setParams({ palate: undefined })
  }, [])

  const clearSearch = useCallback(() => {
    router.setParams({ search: undefined, listing: undefined })
  }, [])

  const navigateToRestaurant = useCallback(
    (result: RestaurantSearchResult) => {
      if (isTPResult(result)) {
        const s = result.slug.trim()
        if (!s) return
        const params: { slug: string; palate?: string } = { slug: s }
        if (!isNoPalateFilter(palate)) params.palate = palate!
        router.push({
          pathname: SCREEN_RESTAURANT_DETAIL,
          params,
        })
        return
      }
      router.push({
        pathname: SCREEN_PLACES_GOOGLE_DETAIL,
        params: { place_id: result.place_id },
      })
    },
    [palate],
  )

  const panMapToResult = useCallback((result: RestaurantSearchResult) => {
    const coords = restaurantSearchResultCoords(result)
    if (
      coords.latitude != null &&
      coords.longitude != null &&
      mapRef.current
    ) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        400,
      )
    }
  }, [])

  const handleCardPress = useCallback(
    (result: RestaurantSearchResult) => {
      const id = restaurantSearchResultId(result)
      setSelectedId(id)
      panMapToResult(result)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      navigateToRestaurant(result)
    },
    [navigateToRestaurant, panMapToResult],
  )

  const scrollSheetToTop = useCallback(() => {
    sheetListRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [])

  const presentPinPreview = useCallback(() => {
    pinPreviewSnapRef.current = true
    scrollSheetToTop()
    bottomSheetRef.current?.snapToIndex(1)
    setTimeout(() => {
      pinPreviewSnapRef.current = false
    }, 500)
  }, [scrollSheetToTop])

  const clearPinSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handlePinPress = useCallback(
    (result: RestaurantSearchResult) => {
      setSelectedId(restaurantSearchResultId(result))
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      panMapToResult(result)
      presentPinPreview()
    },
    [panMapToResult, presentPinPreview],
  )

  const handleSheetIndexChange = useCallback((index: number) => {
    if (pinPreviewSnapRef.current) return
    if (index === 0) setSelectedId(null)
  }, [])

  const handleMapPress = useCallback(
    (_event: MapPressEvent) => {
      if (pinPreviewSnapRef.current) return
      clearPinSelection()
    },
    [clearPinSelection],
  )

  const listHeaderText = useMemo(() => {
    const count = displayRows.length
    const locality = location.label?.trim() || 'your area'
    const title = `${count} listing${count === 1 ? '' : 's'} within ${CITY_SEARCH_RADIUS_KM} km of ${locality}`
    if (!isNoPalateFilter(palate)) {
      return {
        title,
        subtitle: `Sorted by ${labelForPalateKey(palate ?? null)} match`,
      }
    }
    return { title, subtitle: null as string | null }
  }, [displayRows.length, location.label, palate])

  const emptyMessage = useMemo(() => {
    if (searchQuery || palateSortActive) {
      return 'No restaurants match your search. Try adjusting keywords or palate.'
    }
    return `No restaurants found within ${CITY_SEARCH_RADIUS_KM} km. Try another city.`
  }, [searchQuery, palateSortActive])

  const renderResultCard = useCallback(
    (item: RestaurantSearchResult) => {
      const overallRating = isGoogleResult(item)
        ? coerceRatingNumber(item.google_rating)
        : coerceRatingNumber(item.average_rating)

      const palateStat =
        palateSortActive && statsMap && isTPResult(item)
          ? getForRestaurantUuid(item.uuid)
          : null

      return (
        <RestaurantBrowseCard
          title={item.title}
          slug={isTPResult(item) ? item.slug : undefined}
          imageUrl={item.featured_image_url}
          subtitle={formatRestaurantSearchResultAddress(item)}
          listingCategories={isTPResult(item) ? item.cuisines : undefined}
          categories={isTPResult(item) ? item.categories : undefined}
          rating={overallRating}
          reviewCount={
            isTPResult(item)
              ? (item.ratings_count ?? undefined)
              : (item.google_review_count ?? undefined)
          }
          ratingMode={palateSortActive ? 'palate-match' : 'overall'}
          searchPalateRating={palateStat?.avg ?? null}
          searchPalateReviewCount={palateStat?.count}
          containerStyle={cardWidth != null ? { width: cardWidth } : undefined}
          onPress={() => handleCardPress(item)}
          onCommentPress={() => handleCardPress(item)}
        />
      )
    },
    [cardWidth, getForRestaurantUuid, handleCardPress, palateSortActive, statsMap],
  )

  const renderBrowseCard = useCallback(
    ({ item }: { item: RestaurantSearchResult }) => renderResultCard(item),
    [renderResultCard],
  )

  const sheetListHeader = useMemo(
    () => (
      <View className="border-b border-gray-100 pb-3 pt-2">
        <View className="px-4">
          <Text className="font-neusans text-base font-semibold text-[#31343F]">
            {listHeaderText.title}
          </Text>
          {listHeaderText.subtitle ? (
            <Text className="mt-0.5 font-neusans text-xs" style={{ color: BRAND_PRIMARY }}>
              {listHeaderText.subtitle}
            </Text>
          ) : null}
          {error && displayRows.length > 0 ? (
            <Text className="mt-2 text-center text-xs text-red-600">{error}</Text>
          ) : null}
          {palateStatsError && palateSortActive ? (
            <Text className="mt-2 text-center text-xs text-amber-700">{palateStatsError}</Text>
          ) : null}
          {palateStatsLoading && palateSortActive ? (
            <Text className="mt-0.5 font-neusans text-xs text-gray-500">Updating match order…</Text>
          ) : null}
        </View>

        {selectedPinResult ? (
          <View className="mt-3 border-t border-gray-100 pt-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-neusans text-xs font-medium text-gray-500">
                Selected on map
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show all results"
                onPress={clearPinSelection}
                hitSlop={8}
              >
                <Text className="font-neusans text-xs font-medium" style={{ color: BRAND_PRIMARY }}>
                  Show all
                </Text>
              </Pressable>
            </View>
            {renderResultCard(selectedPinResult)}
            {sheetListData.length > 0 ? (
              <Text className="mt-4 font-neusans text-xs font-semibold uppercase tracking-wide text-gray-400">
                All results
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    ),
    [
      clearPinSelection,
      displayRows.length,
      error,
      listHeaderText.subtitle,
      listHeaderText.title,
      palateSortActive,
      palateStatsError,
      palateStatsLoading,
      renderResultCard,
      selectedPinResult,
      sheetListData.length,
    ],
  )

  const showMapLayout = cityMapRegion != null
  const showMapExperience = showMapLayout && !loading && !(error && displayRows.length === 0)

  const filterChips = (
    <View className="bg-white px-4 pb-2 pt-2">
      <PalateFilterChips
        palate={palate}
        searchQuery={searchQuery}
        onClearPalate={clearPalate}
        onClearSearch={clearSearch}
      />
    </View>
  )

  const mapMarkers = useMemo(() => {
    if (!coordinates) return rows
    return rows.filter((result) => {
      const coords = restaurantSearchResultCoords(result)
      if (coords.latitude == null || coords.longitude == null) return false
      return isWithinRadiusKm(
        coordinates,
        coords.latitude,
        coords.longitude,
        CITY_SEARCH_RADIUS_KM,
      )
    })
  }, [rows, coordinates])

  return (
    <View className="flex-1 bg-white">
      {showMapExperience ? (
        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={cityMapRegion}
            showsUserLocation
            showsMyLocationButton={false}
            mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
            onPress={handleMapPress}
          >
            {mapMarkers.map((result) => {
              const id = restaurantSearchResultId(result)
              return (
                <RestaurantMapMarker
                  key={id}
                  result={result}
                  isSelected={selectedId === id}
                  onPress={handlePinPress}
                />
              )
            })}
          </MapView>

          <View className="absolute inset-x-0 top-0 z-10" pointerEvents="box-none">
            <AppTopNav />
            {filterChips}
          </View>

          <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={false}
            enableDynamicSizing={false}
            handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
            onChange={handleSheetIndexChange}
          >
            <BottomSheetFlatList
              ref={sheetListRef}
              data={sheetListData}
              keyExtractor={(item) => restaurantSearchResultId(item)}
              renderItem={renderBrowseCard}
              ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
              ListHeaderComponent={sheetListHeader}
              ListEmptyComponent={
                selectedPinResult ? null : (
                  <Text className="py-8 text-center text-sm text-gray-500">{emptyMessage}</Text>
                )
              }
              ListFooterComponent={
                loadingMore ? (
                  <View className="items-center py-4">
                    <ActivityIndicator color={BRAND_PRIMARY} />
                  </View>
                ) : null
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />
              }
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={0.35}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            />
          </BottomSheet>
        </View>
      ) : (
        <>
          <AppTopNav />
          {filterChips}

          {loading && displayRows.length === 0 ? (
            <View className="flex-1 px-4">
              <RestaurantBrowseSkeletonList cardWidth={cardWidth} />
            </View>
          ) : error && displayRows.length === 0 ? (
            <View className="mt-8 flex-1 items-center px-4">
              <Text className="text-center text-sm text-red-600">{error}</Text>
            </View>
          ) : (
            <View className="flex-1 px-4">
              <FlatList
                className="mt-3 flex-1"
                data={displayRows}
                keyExtractor={(item) => restaurantSearchResultId(item)}
                renderItem={renderBrowseCard}
                ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={
                  listHeaderText.subtitle || palateStatsLoading || palateStatsError ? (
                    <View className="pb-2">
                      {listHeaderText.subtitle ? (
                        <Text className="font-neusans text-xs" style={{ color: BRAND_PRIMARY }}>
                          {listHeaderText.subtitle}
                        </Text>
                      ) : null}
                      {palateStatsLoading && palateSortActive ? (
                        <Text className="mt-0.5 font-neusans text-xs text-gray-500">
                          Updating match order…
                        </Text>
                      ) : null}
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <Text className="mt-8 text-center text-sm text-gray-500">{emptyMessage}</Text>
                }
                ListFooterComponent={
                  loadingMore ? (
                    <View className="w-full pb-4 pt-2">
                      <RestaurantBrowseCardSkeleton width={cardWidth} />
                    </View>
                  ) : null
                }
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />
                }
                onEndReached={() => void loadMore()}
                onEndReachedThreshold={0.35}
              />
            </View>
          )}
        </>
      )}
    </View>
  )
}
