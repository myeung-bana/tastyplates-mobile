import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import BottomSheet, { BottomSheetFlatList, type BottomSheetFlatListMethods } from '@gorhom/bottom-sheet'
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, router } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import { getRestaurantBrowseCardWidth } from '@/components/restaurant/RestaurantBrowseCardItem'
import { RestaurantMapPin } from '@/components/restaurant/RestaurantMapPin'
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
import { cityNameFromLocation } from '@/lib/restaurantDiscoveryHelpers'
import { hybridSearch } from '@/lib/hybridSearch'
import {
  MERGE_GOOGLE_LIMIT_IDLE,
  MERGE_SUPPRESS_TP_COUNT_IDLE,
  SEARCH_BROWSE_LIMIT,
} from '@/lib/restaurantSearchConfig'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { getNearbyRestaurants } from '@/lib/googlePlaces'
import { isNoPalateFilter } from '@/lib/palateSearch'
import { labelForPalateKey } from '@/lib/palateLabels'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import {
  mergeRestaurantResults,
  dedupeRestaurantSearchResults,
  restaurantSearchResultCoords,
  restaurantSearchResultId,
  restaurantSearchResultRating,
} from '@/lib/restaurantSearchMerge'
import {
  formatRestaurantCardAddress,
  getRestaurants,
  normalizeCategoryList,
  normalizeCuisineList,
} from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

const PAGE_SIZE = SEARCH_BROWSE_LIMIT
const ROW_GAP = 12
const SHEET_PEEK = '42%'
const SHEET_EXPANDED = '70%'

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

  const palateSlugs = useMemo(() => (palate ? [palate] : undefined), [palate])

  const [rows, setRows] = useState<RestaurantSearchResult[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const mapRef = useRef<MapView>(null)
  const listRef = useRef<BottomSheetFlatListMethods>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)
  const loadMoreLockRef = useRef(false)

  const snapPoints = useMemo(() => [SHEET_PEEK, SHEET_EXPANDED], [])

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
            palateSlugs,
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
              palateSlugs,
              limit: PAGE_SIZE,
              cursor: null,
              locationKey,
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
    [searchQuery, palateSlugs, locationKey, coordinates, palate, mergeOptions, geoParams, cityName],
  )

  useEffect(() => {
    void fetchFirstPage()
  }, [fetchFirstPage])

  useEffect(() => {
    if (!mapRef.current || !cityMapRegion) return
    mapRef.current.animateToRegion(cityMapRegion, 400)
  }, [cityMapRegion])

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
        palateSlugs,
        limit: PAGE_SIZE,
        cursor,
        locationKey,
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
    palateSlugs,
    locationKey,
    mergeOptions,
    geoParams,
    cityName,
  ])

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

  const handlePinPress = useCallback((result: RestaurantSearchResult, index: number) => {
    const id = restaurantSearchResultId(result)
    setSelectedId(id)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    panMapToResult(result)
    bottomSheetRef.current?.snapToIndex(1)
    globalThis.setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 })
    }, 280)
  }, [panMapToResult])

  const listHeaderText = useMemo(() => {
    const count = rows.length
    const locality = location.label?.trim() || 'your area'
    const title = `${count} listing${count === 1 ? '' : 's'} within ${CITY_SEARCH_RADIUS_KM} km of ${locality}`
    if (!isNoPalateFilter(palate)) {
      return {
        title,
        subtitle: `Sorted by ${labelForPalateKey(palate ?? null)} match`,
      }
    }
    return { title, subtitle: null as string | null }
  }, [rows.length, location.label, palate])

  const emptyMessage = useMemo(() => {
    if (searchQuery || palate) {
      return 'No restaurants match your filters. Try adjusting search or palate.'
    }
    return `No restaurants found within ${CITY_SEARCH_RADIUS_KM} km. Try another city.`
  }, [searchQuery, palate])

  const renderBrowseCard = useCallback(
    ({ item }: { item: RestaurantSearchResult }) => {
      const id = restaurantSearchResultId(item)
      const isSelected = selectedId === id
      const selectedStyle =
        isSelected ? { borderWidth: 2, borderColor: BRAND_PRIMARY, borderRadius: 16 } : undefined

      const overallRating = isGoogleResult(item)
        ? coerceRatingNumber(item.google_rating)
        : coerceRatingNumber(item.average_rating)

      return (
        <View style={selectedStyle}>
          <RestaurantBrowseCard
            title={item.title}
            slug={isTPResult(item) ? item.slug : undefined}
            imageUrl={item.featured_image_url}
            subtitle={
              isTPResult(item)
                ? formatRestaurantCardAddress(item.listing_street, item.address)
                : item.address
            }
            listingCategories={isTPResult(item) ? item.cuisines : undefined}
            categories={isTPResult(item) ? item.categories : undefined}
            rating={overallRating}
            reviewCount={
              isTPResult(item)
                ? (item.ratings_count ?? undefined)
                : (item.google_review_count ?? undefined)
            }
            containerStyle={cardWidth != null ? { width: cardWidth } : undefined}
            onPress={() => handleCardPress(item)}
            onCommentPress={() => handleCardPress(item)}
          />
        </View>
      )
    },
    [cardWidth, handleCardPress, selectedId],
  )

  const sheetListHeader = (
    <View className="border-b border-gray-100 px-4 pb-3 pt-2">
      <Text className="font-neusans text-base font-semibold text-[#31343F]">
        {listHeaderText.title}
      </Text>
      {listHeaderText.subtitle ? (
        <Text className="mt-0.5 font-neusans text-xs" style={{ color: BRAND_PRIMARY }}>
          {listHeaderText.subtitle}
        </Text>
      ) : null}
      {error && rows.length > 0 ? (
        <Text className="mt-2 text-center text-xs text-red-600">{error}</Text>
      ) : null}
    </View>
  )

  const showMapLayout = cityMapRegion != null
  const showMapExperience = showMapLayout && !loading && !(error && rows.length === 0)

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
          >
            {mapMarkers.map((result) => {
              const coords = restaurantSearchResultCoords(result)
              if (coords.latitude == null || coords.longitude == null) return null
              const id = restaurantSearchResultId(result)
              const index = rows.findIndex((r) => restaurantSearchResultId(r) === id)
              return (
                <Marker
                  key={id}
                  coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
                  onPress={() => handlePinPress(result, index >= 0 ? index : 0)}
                  tracksViewChanges={false}
                >
                  <RestaurantMapPin
                    isSelected={selectedId === id}
                    rating={restaurantSearchResultRating(result)}
                  />
                </Marker>
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
          >
            <BottomSheetFlatList
              ref={listRef}
              data={rows}
              keyExtractor={(item) => restaurantSearchResultId(item)}
              renderItem={renderBrowseCard}
              ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
              ListHeaderComponent={sheetListHeader}
              ListEmptyComponent={
                <Text className="py-8 text-center text-sm text-gray-500">{emptyMessage}</Text>
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
              onScrollToIndexFailed={(info) => {
                listRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                })
              }}
            />
          </BottomSheet>
        </View>
      ) : (
        <>
          <AppTopNav />
          {filterChips}

          {loading && rows.length === 0 ? (
            <View className="flex-1 px-4">
              <RestaurantBrowseSkeletonList cardWidth={cardWidth} />
            </View>
          ) : error && rows.length === 0 ? (
            <View className="mt-8 flex-1 items-center px-4">
              <Text className="text-center text-sm text-red-600">{error}</Text>
            </View>
          ) : (
            <View className="flex-1 px-4">
              <FlatList
                className="mt-3 flex-1"
                data={rows}
                keyExtractor={(item) => restaurantSearchResultId(item)}
                renderItem={renderBrowseCard}
                ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
                contentContainerStyle={{ paddingBottom: 24 }}
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
