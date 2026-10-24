import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CircleIconButton } from '@/components/navigation/CircleIconButton'
import {
  RestaurantReviewSortChips,
  type RestaurantReviewSortFilter,
} from '@/components/restaurant/RestaurantReviewSortChips'
import { RestaurantReviewRow, RestaurantReviewRowSkeleton } from '@/components/review/RestaurantReviewRow'
import { BRAND_PRIMARY, SURFACE_CARD, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import {
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { toRestaurantFeedReviewRow } from '@/lib/restaurantReviewFeed'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import type { FollowingFeedReviewRow } from '@/services/followingFeedService'
import { fetchRestaurantReviews } from '@/services/restaurantDetailService'

const PAGE_SIZE = 16
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default function RestaurantReviewsScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    restaurant_uuid?: string | string[]
    restaurant_title?: string | string[]
    restaurant_slug?: string | string[]
  }>()

  const restaurantUuid = firstParam(params.restaurant_uuid)?.trim() ?? ''
  const restaurantTitle = stripHtml(firstParam(params.restaurant_title) ?? '').trim()
  const restaurantSlug = firstParam(params.restaurant_slug)?.trim() ?? ''

  const restaurantBrief = useMemo(
    () => ({
      uuid: restaurantUuid,
      title: restaurantTitle || null,
      slug: restaurantSlug || null,
    }),
    [restaurantUuid, restaurantTitle, restaurantSlug],
  )

  const [sortFilter, setSortFilter] = useState<RestaurantReviewSortFilter>('all')
  const [rows, setRows] = useState<FollowingFeedReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidUuid = !restaurantUuid || !UUID_RE.test(restaurantUuid)
  const headerTitle = restaurantTitle || 'Reviews'

  const onGoBack = useCallback(() => {
    void Haptics.selectionAsync()
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }
    if (restaurantSlug) {
      router.replace({
        pathname: SCREEN_RESTAURANT_DETAIL,
        params: { slug: restaurantSlug },
      })
      return
    }
    router.back()
  }, [navigation, restaurantSlug, router])

  const loadPage = useCallback(
    async (
      mode: 'initial' | 'refresh' | 'append',
      sort: RestaurantReviewSortFilter,
      appendFromOffset?: number,
    ) => {
      if (invalidUuid) return

      if (mode === 'initial') setLoading(true)
      if (mode === 'refresh') setRefreshing(true)
      if (mode === 'append') setLoadingMore(true)
      setError(null)

      const nextOffset = mode === 'append' ? (appendFromOffset ?? 0) : 0

      try {
        const result = await fetchRestaurantReviews(restaurantUuid, {
          limit: PAGE_SIZE,
          offset: nextOffset,
          sort,
        })

        const mapped = (result.reviews ?? []).map((review) =>
          toRestaurantFeedReviewRow(review, restaurantBrief),
        )

        setTotal(result.meta.total)
        setHasMore(result.meta.hasMore)

        if (mode === 'append') {
          setRows((prev) => [...prev, ...mapped])
          setOffset(nextOffset + mapped.length)
        } else {
          setRows(mapped)
          setOffset(mapped.length)
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not load reviews.'
        if (mode === 'append') {
          setHasMore(false)
        } else {
          setRows([])
          setOffset(0)
          setHasMore(false)
          setError(message)
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    },
    [invalidUuid, restaurantBrief, restaurantUuid],
  )

  useEffect(() => {
    if (invalidUuid) {
      setLoading(false)
      return
    }
    setRows([])
    void loadPage('initial', sortFilter)
  }, [invalidUuid, sortFilter, restaurantUuid, loadPage])

  const onRefresh = () => {
    void loadPage('refresh', sortFilter)
  }

  const onEndReached = () => {
    if (loading || refreshing || loadingMore || !hasMore || error) return
    void loadPage('append', sortFilter, offset)
  }

  const onOpenReview = (reviewId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: SCREEN_REVIEW_VIEWER,
      params: { reviewId },
    })
  }

  const onOpenAuthor = (review: FollowingFeedReviewRow) => {
    void Haptics.selectionAsync()
    pushPublicProfile(router, publicProfileFromAuthorFields(review.author_id, review.AuthorProfile))
  }

  const header = (
    <View style={{ paddingTop: insets.top, backgroundColor: SURFACE_CARD }}>
      <View className="flex-row items-center" style={{ height: 52, paddingHorizontal: 16, gap: 12 }}>
        <CircleIconButton icon="chevron-left" accessibilityLabel="Go back" onPress={onGoBack} />
        <View className="min-w-0 flex-1" style={{ gap: 3 }}>
          <Text numberOfLines={1} accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 17, color: TEXT_HEADING }}>
            {headerTitle}
          </Text>
          {!loading && !invalidUuid ? (
            <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
              {total > 0 ? `${total} review${total === 1 ? '' : 's'}` : 'No reviews yet'}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ paddingTop: 12, paddingBottom: 4 }}>
        <RestaurantReviewSortChips active={sortFilter} onChange={setSortFilter} />
      </View>
    </View>
  )

  if (invalidUuid) {
    return (
      <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base font-body" style={{ color: TEXT_BODY }}>
            Invalid restaurant link.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      {loading && !refreshing ? (
        <View style={{ paddingHorizontal: 20 }}>
          {[0, 1, 2].map((i) => (
            <RestaurantReviewRowSkeleton key={i} />
          ))}
        </View>
      ) : (
      <FlatList
        className="flex-1"
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantReviewRow
            review={item}
            onPress={() => onOpenReview(item.id)}
            onPressAuthor={() => onOpenAuthor(item)}
          />
        )}
        ListEmptyComponent={
          error ? (
            <View className="mt-12 items-center px-6">
              <Text className="text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
                {error}
              </Text>
              <Pressable
                onPress={() => void loadPage('initial', sortFilter)}
                className="mt-4 rounded-full px-6 py-2.5 active:opacity-90"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Text className="text-sm text-white font-body-medium">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-12 items-center px-6">
              <Text className="text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
                No reviews yet. Be the first to write one.
              </Text>
              {restaurantSlug ? (
                <Pressable onPress={onGoBack} className="mt-4 py-2">
                  <Text className="text-sm font-body-medium" style={{ color: BRAND_PRIMARY }}>
                    Back to restaurant
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="items-center py-8">
              <ActivityIndicator color={BRAND_PRIMARY} />
            </View>
          ) : null
        }
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />
        }
        onEndReachedThreshold={0.35}
        onEndReached={onEndReached}
        showsVerticalScrollIndicator={false}
      />
      )}
    </View>
  )
}
