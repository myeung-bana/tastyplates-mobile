import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import {
  getRestaurants,
  formatRestaurantListSubtitle,
  type RestaurantListRow,
} from '@/services/restaurantsV2Service'
import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

const PAGE_SIZE = 24

function singleParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

/**
 * Restaurant discovery tab: lists from Nhost `restaurants-v2/get-restaurants`, respects `palate` / `search` / `listing` params.
 */
export default function RestaurantsScreen() {
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
  }, [searchQuery, palateSlugs])

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
      })
      setRows((prev) => [...prev, ...data.restaurants])
      setCursor(data.meta.cursor)
      setHasMore(data.meta.hasMore)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, hasMore, loadingMore, loading, searchQuery, palateSlugs])

  const onRefresh = useCallback(() => {
    void fetchFirstPage({ isPullRefresh: true })
  }, [fetchFirstPage])

  const hasFilters = Boolean(palate ?? searchQuery)

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <AppTopNav />
      <View className="flex-1 px-4 pt-3">
        <Text className="text-xl font-normal" style={{ color: TEXT_HEADING }}>
          Restaurants
        </Text>
        {hasFilters ? (
          <View className="mt-2 rounded-xl border border-orange-100 bg-orange-50/90 px-3 py-2">
            {palate ? (
              <Text className="text-xs text-gray-800">
                <Text className="font-semibold">Palate: </Text>
                {palate}
              </Text>
            ) : null}
            {searchQuery ? (
              <Text className="text-xs text-gray-800">
                <Text className="font-semibold">Search: </Text>
                {searchQuery}
              </Text>
            ) : null}
          </View>
        ) : null}

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
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListHeaderComponent={
              error && rows.length > 0 ? (
                <View className="mb-3 rounded-xl bg-red-50 px-3 py-2">
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
                No restaurants match your filters. Try adjusting search or palate from Home.
              </Text>
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4">
                  <ActivityIndicator color={BRAND_PRIMARY} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <RestaurantBrowseCard
                variant="list"
                title={item.title}
                imageUrl={item.featured_image_url}
                subtitle={formatRestaurantListSubtitle(item.listing_street, item.address)}
                rating={item.average_rating}
                reviewCount={item.ratings_count ?? undefined}
                onPress={() =>
                  router.push({
                    pathname: '/restaurants/[slug]',
                    params: { slug: item.slug },
                  })
                }
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  )
}
