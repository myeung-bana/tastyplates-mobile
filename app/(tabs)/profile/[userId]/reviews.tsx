import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, useWindowDimensions, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { HomeReviewCard, HomeReviewCardSkeleton } from '@/components/review/HomeReviewCard'
import { BRAND_PRIMARY, TEXT_BODY, TEXT_MUTED } from '@/constants/brand'
import { getTabBarHeight } from '@/constants/tabBar'
import { SCREEN_REVIEW_VIEWER } from '@/constants/screens'
import { usePublicProfileReviewsList } from '@/hooks/usePublicProfileReviewsList'
import {
  fetchRestaurantUserById,
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
} from '@/services/restaurantUserService'

const GRID_GAP = 12
const HORIZONTAL_PAD = 20
const SKELETON_ROWS = 2

function ProfileReviewsGridSkeleton({ columnWidth }: { columnWidth: number }): JSX.Element {
  return (
    <View className="w-full">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <View
          key={`profile-reviews-skeleton-row-${row}`}
          className="w-full flex-row justify-between"
          style={row > 0 ? { marginTop: GRID_GAP } : undefined}
        >
          <HomeReviewCardSkeleton width={columnWidth} />
          <HomeReviewCardSkeleton width={columnWidth} />
        </View>
      ))}
    </View>
  )
}

/** Full list of approved reviews for `[userId]` (UUID or username segment). */
export default function PublicProfileReviewsListScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const raw = useLocalSearchParams<{ userId: string | string[] }>()
  const userSeg =
    typeof raw.userId === 'string' ? raw.userId.trim().replace(/^@/, '') : raw.userId?.[0]?.trim() ?? ''

  const { width: windowWidth } = useWindowDimensions()
  const innerWidth = Math.max(0, windowWidth - HORIZONTAL_PAD * 2)
  const columnWidth = Math.max(1, Math.floor((innerWidth - GRID_GAP) / 2))
  const listBottomPad = getTabBarHeight(insets) + 16

  const [authorUuid, setAuthorUuid] = useState<string | null>(
    userSeg && isRestaurantUserRouteId(userSeg) ? userSeg : null,
  )
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(
    Boolean(userSeg) && !isRestaurantUserRouteId(userSeg),
  )

  const {
    rows,
    loading,
    refreshing,
    loadingMore,
    listError,
    loadMore,
    refresh,
  } = usePublicProfileReviewsList(authorUuid)

  useEffect(() => {
    if (!userSeg) {
      setResolveError('Missing profile.')
      setAuthorUuid(null)
      setResolving(false)
      return
    }

    if (isRestaurantUserRouteId(userSeg)) {
      setAuthorUuid(userSeg)
      setResolveError(null)
      setResolving(false)
      return
    }

    let cancelled = false
    setResolveError(null)
    setResolving(true)
    setAuthorUuid(null)

    void (async () => {
      try {
        const ru = await fetchRestaurantUserByUsername(userSeg)
        if (!cancelled) {
          setAuthorUuid(ru.id)
          setResolveError(null)
        }
      } catch {
        if (!cancelled) {
          setAuthorUuid(null)
          setResolveError('We could not find this profile.')
        }
      } finally {
        if (!cancelled) setResolving(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userSeg])

  if (!userSeg) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewDetailTopNav title="Reviews" />
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: TEXT_MUTED }}>Invalid profile link.</Text>
        </View>
      </View>
    )
  }

  if (resolveError) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewDetailTopNav title="Reviews" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base" style={{ color: TEXT_BODY }}>
            {resolveError}
          </Text>
        </View>
      </View>
    )
  }

  const showSkeleton = resolving || loading

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ReviewDetailTopNav title="Reviews" />

      {showSkeleton ? (
        <View style={{ paddingHorizontal: HORIZONTAL_PAD, paddingTop: 12, paddingBottom: listBottomPad }}>
          <ProfileReviewsGridSkeleton columnWidth={columnWidth} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: GRID_GAP }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: HORIZONTAL_PAD,
            paddingTop: 12,
            paddingBottom: listBottomPad,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={BRAND_PRIMARY}
              onRefresh={() => void refresh()}
            />
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
          ListFooterComponent={
            loadingMore ? (
              <View className="items-center py-8">
                <ActivityIndicator color={BRAND_PRIMARY} />
              </View>
            ) : null
          }
          onEndReachedThreshold={0.35}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => (
            <HomeReviewCard
              width={columnWidth}
              review={item}
              onPressCard={() =>
                router.push({
                  pathname: SCREEN_REVIEW_VIEWER,
                  params: { reviewId: item.id },
                })
              }
              onPressAuthor={() => {
                /* Opened from this user’s review list — author press is a no-op. */
              }}
            />
          )}
        />
      )}
    </View>
  )
}
