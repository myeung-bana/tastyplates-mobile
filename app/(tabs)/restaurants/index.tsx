import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { SectionTitle } from '@/components/layout/SectionTitle'
import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import { PalateFilterChips } from '@/components/search/PalateFilterChips'
import {
  getRestaurants,
  formatRestaurantCardAddress,
  type RestaurantListRow,
} from '@/services/restaurantsV2Service'
import { BRAND_PRIMARY } from '@/constants/brand'
import { SCREEN_RESTAURANT_DETAIL } from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import { isNoPalateFilter } from '@/lib/palateSearch'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'

const PAGE_SIZE = 24
const HORIZONTAL_PAD = 16
const ROW_GAP = 12

function singleParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

/**
 * Restaurant discovery tab: lists from Nhost `restaurants-v2/get-restaurants`, respects `palate` / `search` / `listing` params.
 */
export default function RestaurantsScreen() {
  const { width: screenWidth } = useWindowDimensions()
  const { location } = useLocation()
  const locationKey = location.key

  const cardWidth = useMemo(() => screenWidth - HORIZONTAL_PAD * 2, [screenWidth])

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

  const [rows, setRows] = useState<RestaurantListRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFirstPage = useCallback(async (options?: { isPullRefresh?: boolean }) => {
    const isPull = options?.isPullRefresh ?? false
    if (isPull) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setCursor(null)
    }
    setError(null)
    try {
      const data = await getRestaurants({
        search: searchQuery,
        palateSlugs,
        limit: PAGE_SIZE,
        cursor: null,
        locationKey,
      })
      setRows(data.restaurants)
      setCursor(data.meta.cursor)
      setHasMore(data.meta.hasMore)
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
  }, [searchQuery, palateSlugs, locationKey])

  useEffect(() => {
    void fetchFirstPage()
  }, [fetchFirstPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !cursor) return
    setLoadingMore(true)
    setError(null)
    try {
      const data = await getRestaurants({
        search: searchQuery,
        palateSlugs,
        limit: PAGE_SIZE,
        cursor,
        locationKey,
      })
      setRows((prev) => [...prev, ...data.restaurants])
      setCursor(data.meta.cursor)
      setHasMore(data.meta.hasMore)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, hasMore, loadingMore, loading, searchQuery, palateSlugs, locationKey])

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
    (slug: string) => {
      const s = slug.trim()
      if (!s) return
      const params: { slug: string; palate?: string } = { slug: s }
      if (!isNoPalateFilter(palate)) params.palate = palate!
      router.push({
        pathname: SCREEN_RESTAURANT_DETAIL,
        params,
      })
    },
    [palate],
  )

  const renderItem = useCallback(
    ({ item }: { item: RestaurantListRow }) => {
      const overallRating = coerceRatingNumber(item.average_rating)
      const slug = item.slug?.trim() ?? ''
      return (
        <RestaurantBrowseCard
          title={item.title}
          slug={slug || undefined}
          imageUrl={item.featured_image_url}
          subtitle={formatRestaurantCardAddress(item.listing_street, item.address)}
          listingCategories={item.cuisines}
          categories={item.categories}
          rating={overallRating}
          reviewCount={item.ratings_count ?? undefined}
          containerStyle={{ width: cardWidth }}
          onPress={() => navigateToRestaurant(slug)}
          onCommentPress={() => navigateToRestaurant(slug)}
        />
      )
    },
    [cardWidth, navigateToRestaurant],
  )

  return (
    <View className="flex-1 bg-white">
      <AppTopNav />
      <View className="flex-1 px-4">
        <SectionTitle>Restaurants</SectionTitle>

        <PalateFilterChips
          palate={palate}
          searchQuery={searchQuery}
          onClearPalate={clearPalate}
          onClearSearch={clearSearch}
        />

        {loading && rows.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="large" color={BRAND_PRIMARY} />
          </View>
        ) : error && rows.length === 0 ? (
          <View className="mt-8 items-center px-4">
            <Text className="text-center text-sm text-red-600">{error}</Text>
            <Pressable
              onPress={() => void fetchFirstPage()}
              className="mt-4 rounded-full px-5 py-2.5 active:opacity-90"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            className="mt-3 flex-1"
            data={rows}
            keyExtractor={(item) => item.uuid}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: ROW_GAP }} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={
              error && rows.length > 0 ? (
                <View className="mb-3 rounded-xl bg-red-50 px-3 py-2" style={{ width: '100%' }}>
                  <Text className="text-center text-xs text-red-700">{error}</Text>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />
            }
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              <Text className="mt-8 text-center text-sm text-gray-500">
                No restaurants match your filters. Try adjusting search or palate.
              </Text>
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="w-full items-center py-4">
                  <ActivityIndicator color={BRAND_PRIMARY} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  )
}
