import { View, Text, Pressable, Dimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { HomeReviewCard, HomeReviewCardSkeleton } from '@/components/review/HomeReviewCard'
import { HomeSectionCard } from '@/components/home/HomeSectionCard'

import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PUBLIC_PROFILE, SCREEN_REVIEW_VIEWER } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useLatestTrendingReviews } from '@/hooks/useLatestTrendingReviews'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { isRestaurantUserRouteId } from '@/services/restaurantUserService'
import { pushLoginScreen } from '@/lib/authRoutes'

const TRENDING_LIMIT = 6
const GRID_GAP = 12
/** Outer `px-4` + card `p-3` — matches Quick finds gutter. */
const SECTION_H_PAD = 16 * 2 + 12 * 2

type HomeReviewsSectionProps = {
  /** Bumps when the parent pull-to-refresh runs so trending refetches. */
  refreshNonce?: number
}

/** Home review grid — latest trending reviews (`auth-review.md`). */
export function HomeReviewsSection({ refreshNonce = 0 }: HomeReviewsSectionProps) {
  const { isAuthenticated } = useAuth()
  const columnWidth = Math.floor((Dimensions.get('window').width - SECTION_H_PAD - GRID_GAP) / 2)
  const { reviews, loading: trendingLoading, error, reload } = useLatestTrendingReviews(
    TRENDING_LIMIT,
    refreshNonce,
  )

  const onOpenReview = (reviewId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: SCREEN_REVIEW_VIEWER,
      params: { reviewId },
    })
  }

  const onOpenAuthor = (review: TrendingReviewRow) => {
    void Haptics.selectionAsync()
    if (!isAuthenticated) {
      pushLoginScreen(router, { resume: '/(tabs)' })
      return
    }
    const usernameSlug = review.AuthorProfile?.username?.trim().replace(/^@/, '')
    if (usernameSlug) {
      router.push({
        pathname: SCREEN_PUBLIC_PROFILE,
        params: { userId: usernameSlug },
      })
      return
    }
    const id = review.author_id?.trim()
    if (id && isRestaurantUserRouteId(id)) {
      router.push({
        pathname: SCREEN_PUBLIC_PROFILE,
        params: { userId: id },
      })
    }
  }

  return (
    <HomeSectionCard title="Recent reviews">
      {trendingLoading ? (
        <View className="w-full">
          {[0, 1].map((row) => (
            <View key={row} className="mb-3 w-full flex-row justify-between">
              <HomeReviewCardSkeleton width={columnWidth} />
              <HomeReviewCardSkeleton width={columnWidth} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View className="items-center px-2">
          <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            {error}
          </Text>
          <Pressable
            onPress={() => reload()}
            className="mt-3 rounded-full px-6 py-2.5 active:opacity-90"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Text className="text-sm font-medium text-white">Try again</Text>
          </Pressable>
        </View>
      ) : reviews.length === 0 ? (
        <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
          No reviews yet — check back soon.
        </Text>
      ) : (
        <View className="w-full">
          {Array.from({ length: Math.ceil(reviews.length / 2) }, (_, row) => {
            const left = reviews[row * 2]
            const right = reviews[row * 2 + 1]
            return (
              <View key={left.id} className="mb-3 w-full flex-row justify-between">
                <HomeReviewCard
                  width={columnWidth}
                  review={left}
                  onPressCard={() => onOpenReview(left.id)}
                  onPressAuthor={() => onOpenAuthor(left)}
                />
                {right ? (
                  <HomeReviewCard
                    width={columnWidth}
                    review={right}
                    onPressCard={() => onOpenReview(right.id)}
                    onPressAuthor={() => onOpenAuthor(right)}
                  />
                ) : (
                  <View style={{ width: columnWidth }} />
                )}
              </View>
            )
          })}
        </View>
      )}
    </HomeSectionCard>
  )
}
