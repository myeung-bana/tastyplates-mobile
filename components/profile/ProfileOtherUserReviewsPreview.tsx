import type { ReactNode } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { HomeReviewCard } from '@/components/review/HomeReviewCard'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

const GRID_GAP = 12
/** Scroll `paddingHorizontal: 20` + reviews section `px-2` (no inner tray padding). */
const PREVIEW_HORIZONTAL_GUTTERS = 40 + 16

export interface ProfileOtherUserReviewsPreviewProps {
  error: string | null
  reviews: TrendingReviewRow[]
  total: number
  onPressReview: (reviewId: string) => void
  onPressViewAll: () => void
}

/**
 * Latest reviews on another user’s profile — card grid + primary pill CTA (`design_system.md` §5.1 primary, §5.3 card).
 */
export function ProfileOtherUserReviewsPreview({
  error,
  reviews,
  total,
  onPressReview,
  onPressViewAll,
}: ProfileOtherUserReviewsPreviewProps) {
  const { width: windowWidth } = useWindowDimensions()
  const innerW = Math.max(0, windowWidth - PREVIEW_HORIZONTAL_GUTTERS)
  const columnWidth = Math.max(1, Math.floor((innerW - GRID_GAP) / 2))

  /** Content wrapper — flush with white profile scroll (no grey tray). */
  const previewWrap = (inner: ReactNode, tailClass?: string) => (
    <View className={`pt-1 ${tailClass ?? ''}`}>{inner}</View>
  )

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
        Reviews from this account will appear here soon.
      </Text>,
      'pb-4',
    )
  }

  const left = reviews[0]
  const right = reviews[1]

  return previewWrap(
    <>
      <View className="w-full flex-row justify-between">
        {left ? (
          <HomeReviewCard
            key={left.id}
            width={columnWidth}
            review={left}
            onPressCard={() => onPressReview(left.id)}
            onPressAuthor={() => {}}
          />
        ) : null}
        {right ? (
          <HomeReviewCard
            key={right.id}
            width={columnWidth}
            review={right}
            onPressCard={() => onPressReview(right.id)}
            onPressAuthor={() => {}}
          />
        ) : (
          <View style={{ width: columnWidth }} />
        )}
      </View>

      {/* Primary CTA — design_system §5.1 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View all reviews"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onPressViewAll()
        }}
        className="mt-6 w-full items-center justify-center rounded-full px-8 py-3 active:opacity-90"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        <Text className="text-sm font-normal text-white">
          View all reviews{total > 2 ? ` (${total})` : ''}
        </Text>
      </Pressable>
    </>,
    'pb-4',
  )
}
