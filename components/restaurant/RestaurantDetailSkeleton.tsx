import type { ReactNode } from 'react'
import { Dimensions, ScrollView, View } from 'react-native'

import { HomeReviewCardSkeleton } from '@/components/review/HomeReviewCard'
import {
  SkeletonBlock,
  useSkeletonPulse,
} from '@/components/ui/Skeleton/RestaurantListSkeleton'

const { width: SCREEN_W } = Dimensions.get('window')

const HERO_HEIGHT = Math.max(256, Math.min(SCREEN_W * 0.56, 440))
const REVIEW_CARD_GAP = 12
const REVIEW_SECTION_EDGE_INSET = 32

function SectionShell({
  children,
  bordered = false,
}: {
  children: ReactNode
  bordered?: boolean
}): JSX.Element {
  return (
    <View
      className={`mx-4 mt-4 overflow-hidden rounded-2xl bg-white p-6 ${bordered ? 'border border-gray-200' : ''}`}
    >
      {children}
    </View>
  )
}

function ActionPillSkeleton({
  opacity,
  width,
}: {
  opacity: ReturnType<typeof useSkeletonPulse>
  width: number
}): JSX.Element {
  return (
    <SkeletonBlock
      opacity={opacity}
      style={{ width, height: 36, borderRadius: 50 }}
    />
  )
}

/**
 * Loading placeholder for {@link RestaurantDetailView} — mirrors gallery, header, actions, ratings, location, details, reviews.
 */
export function RestaurantDetailSkeleton(): JSX.Element {
  const opacity = useSkeletonPulse()
  const reviewCardWidth = Math.max(
    148,
    Math.floor((SCREEN_W - REVIEW_SECTION_EDGE_INSET * 2 - REVIEW_CARD_GAP) / 2),
  )

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Hero gallery */}
      <SkeletonBlock opacity={opacity} style={{ width: SCREEN_W, height: HERO_HEIGHT }} />

      {/* Header card */}
      <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white p-4">
        <SkeletonBlock opacity={opacity} style={{ width: 88, height: 24, borderRadius: 20, marginBottom: 8 }} />
        <View className="mb-2 flex-row items-center gap-2.5">
          <SkeletonBlock opacity={opacity} style={{ height: 28, borderRadius: 6, flex: 1 }} />
          <SkeletonBlock opacity={opacity} style={{ width: 56, height: 22, borderRadius: 20 }} />
        </View>
        <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, width: '72%', marginBottom: 8 }} />
        <View className="mb-2 flex-row gap-2">
          <SkeletonBlock opacity={opacity} style={{ width: 72, height: 24, borderRadius: 20 }} />
          <SkeletonBlock opacity={opacity} style={{ width: 64, height: 24, borderRadius: 20 }} />
        </View>
        <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, width: '34%' }} />
      </View>

      {/* Action pills */}
      <View className="mx-4 mt-6 flex-row flex-wrap gap-2">
        <ActionPillSkeleton opacity={opacity} width={96} />
        <ActionPillSkeleton opacity={opacity} width={72} />
        <ActionPillSkeleton opacity={opacity} width={104} />
        <ActionPillSkeleton opacity={opacity} width={80} />
        <ActionPillSkeleton opacity={opacity} width={88} />
        <SkeletonBlock opacity={opacity} style={{ width: 36, height: 36, borderRadius: 18 }} />
      </View>

      {/* Ratings */}
      <SectionShell>
        <SkeletonBlock opacity={opacity} style={{ height: 20, borderRadius: 4, width: 88, marginBottom: 16 }} />
        <View className="flex-row justify-between gap-3">
          {[0, 1, 2].map((index) => (
            <View key={`rating-metric-${index}`} className="min-w-0 flex-1 items-center gap-2">
              <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '88%' }} />
              <SkeletonBlock opacity={opacity} style={{ height: 28, borderRadius: 6, width: 48 }} />
              <SkeletonBlock opacity={opacity} style={{ height: 10, borderRadius: 4, width: '70%' }} />
            </View>
          ))}
        </View>
      </SectionShell>

      {/* Location */}
      <SectionShell>
        <SkeletonBlock opacity={opacity} style={{ height: 20, borderRadius: 4, width: 96, marginBottom: 16 }} />
        <SkeletonBlock opacity={opacity} style={{ height: 256, borderRadius: 12, width: '100%', marginBottom: 12 }} />
        <View className="flex-row items-center gap-3">
          <SkeletonBlock opacity={opacity} style={{ width: 18, height: 18, borderRadius: 4 }} />
          <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, flex: 1 }} />
        </View>
      </SectionShell>

      {/* Restaurant details */}
      <SectionShell bordered>
        <SkeletonBlock opacity={opacity} style={{ height: 20, borderRadius: 4, width: 148, marginBottom: 16 }} />
        <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '100%', marginBottom: 8 }} />
        <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '94%', marginBottom: 8 }} />
        <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '78%', marginBottom: 12 }} />
        <SkeletonBlock opacity={opacity} style={{ height: 44, borderRadius: 12, width: '100%', marginBottom: 16 }} />
        <SkeletonBlock opacity={opacity} style={{ height: 16, borderRadius: 4, width: '62%', marginBottom: 16 }} />
        <View className="mb-4 flex-row items-center gap-3">
          <SkeletonBlock opacity={opacity} style={{ width: 20, height: 20, borderRadius: 4 }} />
          <View className="flex-1 gap-2">
            <SkeletonBlock opacity={opacity} style={{ height: 10, borderRadius: 4, width: 48 }} />
            <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, width: '56%' }} />
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <SkeletonBlock opacity={opacity} style={{ width: 20, height: 20, borderRadius: 4 }} />
          <View className="gap-2">
            <SkeletonBlock opacity={opacity} style={{ height: 10, borderRadius: 4, width: 72 }} />
            <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, width: 40 }} />
          </View>
        </View>
      </SectionShell>

      {/* Reviews carousel */}
      <View className="mx-4 mt-4 rounded-2xl bg-white p-4">
        <SkeletonBlock opacity={opacity} style={{ height: 18, borderRadius: 4, width: 80, marginBottom: 12 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[0, 1].map((index) => (
            <View
              key={`review-skeleton-${index}`}
              style={{ marginRight: index === 0 ? REVIEW_CARD_GAP : 0 }}
            >
              <HomeReviewCardSkeleton width={reviewCardWidth} />
            </View>
          ))}
        </ScrollView>
        <SkeletonBlock opacity={opacity} style={{ height: 44, borderRadius: 12, width: '100%', marginTop: 12 }} />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}
