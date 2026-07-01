import { ActivityIndicator, FlatList, RefreshControl, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HomeReviewCard, HomeReviewCardSkeleton } from '@/components/review/HomeReviewCard'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import { getTabBarHeight } from '@/constants/tabBar'
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
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const innerWidth = Math.max(0, windowWidth - HORIZONTAL_PAD * 2)
  const columnWidth = Math.max(1, Math.floor((innerWidth - GRID_GAP) / 2))
  const listBottomPad = getTabBarHeight(insets) + 16

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
            <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              {listError}
            </Text>
          </View>
        ) : (
          <View className="mt-24 items-center px-6">
            <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
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
        <HomeReviewCard
          width={columnWidth}
          review={item}
          onPressCard={() => onPressReview(item.id)}
          onPressAuthor={() => {}}
        />
      )}
    />
  )
}
