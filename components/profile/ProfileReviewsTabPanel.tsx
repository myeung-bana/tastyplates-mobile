import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native'

import { ImageFallback } from '@/components/brand/ImageFallback'
import { StarRow } from '@/components/ui/StarRow'
import { FONT } from '@/constants/typography'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { firstReviewImageUri } from '@/lib/reviewDisplayUtils'

import { HomeReviewCardSkeleton } from '@/components/review/HomeReviewCard'
import { BRAND_PRIMARY, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { usePublicProfileReviewsList } from '@/hooks/usePublicProfileReviewsList'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

const GRID_GAP = 12
const HORIZONTAL_PAD = 20
const SKELETON_ROWS = 3

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

/** Reviews grid tile (design P2): photo, restaurant name, stars. */
function ProfileReviewTile({
  width,
  review,
  onPress,
}: {
  width: number
  review: TrendingReviewRow
  onPress: () => void
}): JSX.Element {
  const img = firstReviewImageUri(review.images, '')
  const name = review.restaurant?.title?.trim() || stripHtml(review.title ?? '').trim() || 'Review'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} review`}
      onPress={onPress}
      className="active:opacity-90"
      style={{ width, gap: 6 }}
    >
      {img ? (
        <Image source={{ uri: img }} style={{ width, height: 168, borderRadius: 12, backgroundColor: SURFACE_FOG }} />
      ) : (
        <ImageFallback style={{ width, height: 168, borderRadius: 12 }} />
      )}
      <Text numberOfLines={1} style={{ fontFamily: FONT.heading, fontSize: 14, color: TEXT_HEADING }}>
        {name}
      </Text>
      <StarRow value={review.rating} />
    </Pressable>
  )
}

export type ProfileReviewsTabPanelProps = {
  userId: string
  isOwnProfile?: boolean
  onPressReview: (reviewId: string) => void
  emptyMessage?: string
}

/** Paginated approved-review grid for the profile Reviews tab. */
export function ProfileReviewsTabPanel({
  userId,
  onPressReview,
  emptyMessage = 'Reviews from this account will appear here soon.',
}: ProfileReviewsTabPanelProps): JSX.Element {
  const { width: windowWidth } = useWindowDimensions()
  const innerWidth = Math.max(0, windowWidth - HORIZONTAL_PAD * 2)
  const columnWidth = Math.max(1, Math.floor((innerWidth - GRID_GAP) / 2))
  const listBottomPad = 16

  const {
    rows,
    loading,
    refreshing,
    loadingMore,
    listError,
    loadMore,
    refresh,
  } = usePublicProfileReviewsList(userId)

  if (loading && rows.length === 0) {
    return (
      <View style={{ paddingHorizontal: HORIZONTAL_PAD, paddingTop: 12, paddingBottom: listBottomPad }}>
        <ProfileReviewsGridSkeleton columnWidth={columnWidth} />
      </View>
    )
  }

  return (
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
            <Text className="text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
              {listError}
            </Text>
          </View>
        ) : (
          <View className="mt-24 items-center px-6">
            <Text className="text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
              {emptyMessage}
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
      renderItem={({ item }: { item: TrendingReviewRow }) => (
        <ProfileReviewTile width={columnWidth} review={item} onPress={() => onPressReview(item.id)} />
      )}
    />
  )
}
