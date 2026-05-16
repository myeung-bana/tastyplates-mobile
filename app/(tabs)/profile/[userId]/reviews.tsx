import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { HomeReviewCard } from '@/components/review/HomeReviewCard'
import {
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_REVIEW_VIEWER } from '@/constants/screens'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { fetchUserReviews } from '@/services/profileUserReviewsService'
import {
  fetchRestaurantUserById,
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
} from '@/services/restaurantUserService'

const PAGE = 16

/** Full list of approved reviews for `[userId]` (UUID or username segment). */
export default function PublicProfileReviewsListScreen() {
  const router = useRouter()
  const raw = useLocalSearchParams<{ userId: string | string[] }>()
  const userSeg =
    typeof raw.userId === 'string' ? raw.userId.trim().replace(/^@/, '') : raw.userId?.[0]?.trim() ?? ''

  const { width: windowWidth } = useWindowDimensions()
  const cardWidth = Math.max(280, Math.floor(windowWidth - 40))

  const [authorUuid, setAuthorUuid] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const [rows, setRows] = useState<TrendingReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!userSeg) {
      setResolveError('Missing profile.')
      setAuthorUuid(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setResolveError(null)

    async function resolve() {
      try {
        const ru = isRestaurantUserRouteId(userSeg)
          ? await fetchRestaurantUserById(userSeg)
          : await fetchRestaurantUserByUsername(userSeg)
        if (!cancelled) setAuthorUuid(ru.id)
      } catch {
        if (!cancelled) {
          setAuthorUuid(null)
          setResolveError('We could not find this profile.')
        }
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [userSeg])

  useEffect(() => {
    if (!authorUuid) {
      setLoading(Boolean(userSeg) && resolveError === null)
      setRows([])
      setOffset(0)
      setHasMore(false)
      return
    }

    let c = false
    setLoading(true)
    ;(async () => {
      setListError(null)
      try {
        const r = await fetchUserReviews(authorUuid, { limit: PAGE, offset: 0 })
        if (c) return
        setRows(r.reviews)
        setOffset(r.reviews.length)
        setHasMore(r.meta.hasMore)
      } catch {
        if (!c) {
          setRows([])
          setHasMore(false)
          setOffset(0)
          setListError('Could not load reviews.')
        }
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [authorUuid])

  /** When appending: offset must reflect current list length — use functional reload for append edge case */
  const onEndReached = useCallback(async () => {
    if (!authorUuid || !hasMore || loadingMore || loading || listError) return
    setLoadingMore(true)
    try {
      const r = await fetchUserReviews(authorUuid, {
        limit: PAGE,
        offset,
      })
      setRows((prev) => [...prev, ...r.reviews])
      setOffset((prev) => prev + r.reviews.length)
      setHasMore(r.meta.hasMore)
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [authorUuid, hasMore, loadingMore, loading, listError, offset])

  const onRefresh = useCallback(async () => {
    if (!authorUuid) return
    setRefreshing(true)
    try {
      setListError(null)
      const r = await fetchUserReviews(authorUuid, { limit: PAGE, offset: 0 })
      setRows(r.reviews)
      setOffset(r.reviews.length)
      setHasMore(r.meta.hasMore)
    } catch {
      setListError('Could not load reviews.')
    } finally {
      setRefreshing(false)
    }
  }, [authorUuid])

  if (!userSeg) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text style={{ color: TEXT_MUTED }}>Invalid profile link.</Text>
      </View>
    )
  }

  if (resolveError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-base" style={{ color: TEXT_BODY }}>
          {resolveError}
        </Text>
      </View>
    )
  }

  if (loading || !authorUuid) {
    return (
      <View className="flex-1 items-center justify-center py-24">
        <ActivityIndicator color={BRAND_PRIMARY} size="large" />
      </View>
    )
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={BRAND_PRIMARY} onRefresh={() => void onRefresh()} />
      }
      ListEmptyComponent={
        listError ? (
          <View className="mt-16 items-center px-4">
            <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              {listError}
            </Text>
          </View>
        ) : (
          <View className="mt-24 items-center px-6">
            <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              Reviews from this account will appear here soon.
            </Text>
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
      ListFooterComponent={
        loadingMore ? (
          <View className="items-center py-8">
            <ActivityIndicator color={BRAND_PRIMARY} />
          </View>
        ) : null
      }
      onEndReachedThreshold={0.35}
      onEndReached={() => void onEndReached()}
      renderItem={({ item }) => (
        <HomeReviewCard
          width={cardWidth}
          review={item}
          onPressCard={() =>
            router.push({
              pathname: SCREEN_REVIEW_VIEWER,
              params: { reviewId: item.id },
            })
          }
          onPressAuthor={() => {
            /* Viewer came from profile — noop */
          }}
        />
      )}
    />
  )
}
