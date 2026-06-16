import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { HomeReviewCard } from '@/components/review/HomeReviewCard'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { PROFILE_REVIEWS_PREVIEW_LIMIT } from '@/services/profileUserReviewsService'

const GRID_GAP = 12
/** Scroll `paddingHorizontal: 20` + reviews section `px-2` (no inner tray padding). */
const PREVIEW_HORIZONTAL_GUTTERS = 40 + 16

export interface ProfileOtherUserReviewsPreviewProps {
  error: string | null
  loading?: boolean
  reviews: TrendingReviewRow[]
  total: number
  emptyMessage?: string
  onPressReview: (reviewId: string) => void
  onPressViewAll: () => void
}

/**
 * Latest reviews on a profile — up to four cards in a 2×2 grid + optional CTA.
 */
export function ProfileOtherUserReviewsPreview({
  error,
  loading = false,
  reviews,
  total,
  emptyMessage = 'Reviews from this account will appear here soon.',
  onPressReview,
  onPressViewAll,
}: ProfileOtherUserReviewsPreviewProps) {
  const { width: windowWidth } = useWindowDimensions()
  const innerW = Math.max(0, windowWidth - PREVIEW_HORIZONTAL_GUTTERS)
  const columnWidth = Math.max(1, Math.floor((innerW - GRID_GAP) / 2))

  const previewWrap = (inner: ReactNode, tailClass?: string) => (
    <View className={`pt-1 ${tailClass ?? ''}`}>{inner}</View>
  )

  if (loading && reviews.length === 0) {
    return previewWrap(
      <View className="items-center py-8">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>,
      'pb-4',
    )
  }

  if (error) {
    return previewWrap(
      <Text className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
        {error}
      </Text>,
      'pb-4',
    )
  }

  if (reviews.length === 0) {
    return previewWrap(
      <Text className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
        {emptyMessage}
      </Text>,
      'pb-4',
    )
  }

  const topRow = reviews.slice(0, 2)
  const bottomRow = reviews.slice(2, PROFILE_REVIEWS_PREVIEW_LIMIT)
  const showViewAll = total > PROFILE_REVIEWS_PREVIEW_LIMIT

  const renderCard = (review: TrendingReviewRow) => (
    <HomeReviewCard
      key={review.id}
      width={columnWidth}
      review={review}
      onPressCard={() => onPressReview(review.id)}
      onPressAuthor={() => {}}
    />
  )

  const renderRow = (row: TrendingReviewRow[]) => (
    <View className="w-full flex-row justify-between">
      {row.map(renderCard)}
      {row.length === 1 ? <View style={{ width: columnWidth }} /> : null}
    </View>
  )

  return previewWrap(
    <>
      {renderRow(topRow)}
      {bottomRow.length > 0 ? <View style={{ marginTop: GRID_GAP }}>{renderRow(bottomRow)}</View> : null}

      {showViewAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all Reviews"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onPressViewAll()
          }}
          className="mt-6 w-full items-center justify-center rounded-full px-8 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Text className="text-sm font-normal text-white">View all Reviews</Text>
        </Pressable>
      ) : null}
    </>,
    'pb-4',
  )
}
