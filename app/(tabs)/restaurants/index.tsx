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
import { StatusBar } from 'expo-status-bar'
import { useLocalSearchParams, router } from 'expo-router'
import { NativeViewGestureHandler } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
import { getTabSceneStylePaddingBottom } from '@/constants/tabBar'
import {
  SCREEN_PLACES_GOOGLE_DETAIL,
  SCREEN_RESTAURANT_DETAIL,
} from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import { useTabBarScrollHandler } from '@/hooks/useTabBarScrollHandler'
import {
  CITY_SEARCH_RADIUS_KM,
  isWithinRadiusKm,
  mapRegionForRadiusKm,
} from '@/lib/geoUtils'
import {
  cityNameFromLocation,
  formatRestaurantSearchResultAddress,
} from '@/lib/restaurantDiscoveryHelpers'
import { usePersonalisedRestaurants, preferenceStatForSearchResult } from '@/hooks/usePersonalisedRestaurants'
import { labelForPalateKey } from '@/lib/palateLabels'
import { isCuisineFilterActive, isNoCuisineFilter, readCuisineParam } from '@/lib/palateSearch'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import {
  restaurantSearchResultCoords,
  restaurantSearchResultId,
} from '@/lib/restaurantSearchMerge'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

const ROW_GAP = 12
/** Collapsed — maximizes map for pinch/zoom; shows handle + list header peek. */
const SHEET_MIN_RATIO = 0.18
/** Mid — browse a few cards without covering most of the map. */
const SHEET_MID_RATIO = 0.42
const SHEET_EXPANDED_RATIO = 0.72
/** Drop results sheet 10px lower than percentage-only snap points. */
const SHEET_DROP_PX = 10
const SHEET_MIN_HEIGHT_PX = 96
/** Top chrome sits 10px below the screen top on map Explore. */
const MAP_OVERLAY_TOP_OFFSET = 10

function singleParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

/**
 * Restaurant discovery: hybrid TP + Google search with map + bottom sheet (or FlatList fallback).
 */
export default function RestaurantsScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { location } = useLocation()
  const locationKey = location.key
  const coordinates = location.coordinates ?? null

  const cardWidth = useMemo(
    () => (screenWidth > 0 ? getRestaurantBrowseCardWidth(screenWidth) : undefined),
    [screenWidth],
  )

  const cityName = useMemo(() => cityNameFromLocation(location), [location.label, location.key])

  const cityMapRegion: Region | undefined = useMemo(() => {
    if (!coordinates) return undefined
    return mapRegionForRadiusKm(coordinates, CITY_SEARCH_RADIUS_KM)
  }, [coordinates?.latitude, coordinates?.longitude])

  const raw = useLocalSearchParams<{
    cuisine?: string | string[]
    palate?: string | string[]
    search?: string | string[]
    listing?: string | string[]
  }>()

  const cuisine = readCuisineParam(raw)
  const search = singleParam(raw.search)
  const listing = singleParam(raw.listing)

  const searchQuery = useMemo(() => {
    const a = search?.trim()
    const b = listing?.trim()
    if (a && b) return `${a} ${b}`.trim()
    return a ?? b ?? undefined
  }, [search, listing])

  const cuisineFilterActive = isCuisineFilterActive(cuisine)

  const {
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
  } = usePersonalisedRestaurants({
    cuisineParam: cuisine,
    searchQuery,
    locationKey,
    coordinates,
    cityName,
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const mapRef = useRef<MapView>(null)
  const mapGestureRef = useRef<NativeViewGestureHandler>(null)
  const bottomSheetRef = useRef<BottomSheet>(null)
  const sheetListRef = useRef<FlatList<RestaurantSearchResult>>(null)
  const loadMoreLockRef = useRef(false)
  /** Skip clearing pin selection while reopening sheet for map pin preview. */
  const pinPreviewSnapRef = useRef(false)
  /** Skip redundant animateToRegion when MapView `initialRegion` already matches. */
  const lastMapRegionKeyRef = useRef<string | null>(null)

  const snapPoints = useMemo(() => {
    const scenePad = getTabSceneStylePaddingBottom(insets)
    const containerHeight = Math.max(0, screenHeight - scenePad)
    const drop = (ratio: number) =>
      Math.max(SHEET_MIN_HEIGHT_PX, Math.round(containerHeight * ratio) - SHEET_DROP_PX)
    return [
      drop(SHEET_MIN_RATIO),
      drop(SHEET_MID_RATIO),
      drop(SHEET_EXPANDED_RATIO),
    ]
  }, [screenHeight, insets.bottom])

  useEffect(() => {
    if (!mapRef.current || !cityMapRegion) return
    const key = `${locationKey}|${cityMapRegion.latitude}|${cityMapRegion.longitude}|${cityMapRegion.latitudeDelta}`
    if (lastMapRegionKeyRef.current === key) return
    const isInitial = lastMapRegionKeyRef.current === null
    lastMapRegionKeyRef.current = key
    if (isInitial) return
    mapRef.current.animateToRegion(cityMapRegion, 400)
  }, [cityMapRegion, locationKey])

  const handleLoadMore = useCallback(() => {
    if (loadMoreLockRef.current) return
    loadMoreLockRef.current = true
    void loadMore().finally(() => {
      loadMoreLockRef.current = false
    })
  }, [loadMore])

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
    setSelectedId(null)
    void refresh({ isPullRefresh: true })
  }, [refresh])

  const clearCuisine = useCallback(() => {
    router.setParams({ cuisine: undefined, palate: undefined })
  }, [])

  const clearSearch = useCallback(() => {
    router.setParams({ search: undefined, listing: undefined })
  }, [])

  const navigateToRestaurant = useCallback(
    (result: RestaurantSearchResult) => {
      if (isTPResult(result)) {
        const s = result.slug.trim()
        if (!s) return
        const params: { slug: string; cuisine?: string } = { slug: s }
        if (!isNoCuisineFilter(cuisine)) params.cuisine = cuisine!
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
    [cuisine],
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

  const trustSetReviewerLabel = useMemo(() => {
    if (trustSet.length === 0) return null
    return trustSet.map((slug) => labelForPalateKey(slug)).join(' & ')
  }, [trustSet])

  const listHeaderText = useMemo(() => {
    const count = displayRows.length
    const locality = location.label?.trim() || 'your area'
    const title = `${count} listing${count === 1 ? '' : 's'} within ${CITY_SEARCH_RADIUS_KM} km of ${locality}`
    if (isPersonalised && trustSetReviewerLabel) {
      return {
        title,
        subtitle: `✦ Ranked for your palate — based on ${trustSetReviewerLabel} reviewers`,
      }
    }
    if (cuisineFilterActive) {
      return {
        title,
        subtitle: 'Sort: Highest Rated',
      }
    }
    return { title, subtitle: null as string | null }
  }, [displayRows.length, location.label, isPersonalised, trustSetReviewerLabel, cuisineFilterActive])

  const emptyMessage = useMemo(() => {
    if (searchQuery || cuisineFilterActive) {
      return 'No restaurants match your search. Try adjusting keywords or cuisine.'
    }
    return `No restaurants found within ${CITY_SEARCH_RADIUS_KM} km. Try another city.`
  }, [searchQuery, cuisineFilterActive])

  const renderResultCard = useCallback(
    (item: RestaurantSearchResult) => {
      const overallRating = isGoogleResult(item)
        ? coerceRatingNumber(item.google_rating)
        : coerceRatingNumber(item.average_rating)

      const palateStat = isPersonalised
        ? preferenceStatForSearchResult(item, getForRestaurantUuid)
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
          ratingMode={isPersonalised ? 'palate-match' : 'overall'}
          searchPalateRating={palateStat?.avg ?? null}
          searchPalateReviewCount={palateStat?.count}
          containerStyle={cardWidth != null ? { width: cardWidth } : undefined}
          onPress={() => handleCardPress(item)}
          onCommentPress={() => handleCardPress(item)}
        />
      )
    },
    [cardWidth, getForRestaurantUuid, handleCardPress, isPersonalised],
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
          {prefStatsError && isPersonalised ? (
            <Text className="mt-2 text-center text-xs text-amber-700">{prefStatsError}</Text>
          ) : null}
          {prefStatsLoading && isPersonalised ? (
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
      prefStatsError,
      prefStatsLoading,
      isPersonalised,
      renderResultCard,
      selectedPinResult,
      sheetListData.length,
    ],
  )

  const showMapLayout = cityMapRegion != null
  const showMapExperience = showMapLayout && !loading && !(error && displayRows.length === 0)
  const { onScroll, scrollEventThrottle } = useTabBarScrollHandler({ enabled: !showMapExperience })
  const hasActiveFilters = cuisineFilterActive || Boolean(searchQuery?.trim())

  const filterChips = hasActiveFilters ? (
    <View
      className={showMapExperience ? 'px-4 pb-2' : 'bg-white px-4 pb-2'}
      style={showMapExperience ? { backgroundColor: 'transparent' } : undefined}
    >
      <PalateFilterChips
        cuisine={cuisine}
        searchQuery={searchQuery}
        onClearCuisine={clearCuisine}
        onClearSearch={clearSearch}
        isPersonalised={isPersonalised}
      />
    </View>
  ) : null

  const mapMarkers = useMemo(() => {
    if (!coordinates) return displayRows
    return displayRows.filter((result) => {
      const coords = restaurantSearchResultCoords(result)
      if (coords.latitude == null || coords.longitude == null) return false
      return isWithinRadiusKm(
        coordinates,
        coords.latitude,
        coords.longitude,
        CITY_SEARCH_RADIUS_KM,
      )
    })
  }, [displayRows, coordinates])

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: showMapExperience ? 'transparent' : '#ffffff' }}
    >
      {showMapExperience ? (
        <>
          <StatusBar style="dark" translucent />
          <View className="flex-1" style={{ pointerEvents: 'box-none' }}>
          <NativeViewGestureHandler
            ref={mapGestureRef}
            disallowInterruption
            style={[StyleSheet.absoluteFillObject, { top: -insets.top }]}
          >
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
          </NativeViewGestureHandler>

          <View
            className="absolute inset-x-0 z-10"
            style={{ top: MAP_OVERLAY_TOP_OFFSET }}
            pointerEvents="box-none"
          >
            <AppTopNav variant="mapOverlay" />
            {filterChips}
          </View>

          <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            topInset={0}
            bottomInset={0}
            enablePanDownToClose={false}
            enableDynamicSizing={false}
            waitFor={mapGestureRef}
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
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.35}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            />
          </BottomSheet>
          </View>
        </>
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
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
                ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={
                  listHeaderText.subtitle || prefStatsLoading || prefStatsError ? (
                    <View className="pb-2">
                      {listHeaderText.subtitle ? (
                        <Text className="font-neusans text-xs" style={{ color: BRAND_PRIMARY }}>
                          {listHeaderText.subtitle}
                        </Text>
                      ) : null}
                      {prefStatsLoading && isPersonalised ? (
                        <Text className="mt-0.5 font-neusans text-xs text-gray-500">
                          Updating match order…
                        </Text>
                      ) : null}
                      {prefStatsError && isPersonalised ? (
                        <Text className="mt-0.5 font-neusans text-xs text-amber-700">
                          {prefStatsError}
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
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.35}
              />
            </View>
          )}
        </>
      )}
    </View>
  )
}
