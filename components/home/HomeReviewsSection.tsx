import { useState } from 'react'
import { View, Text, Pressable, Dimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { HomeReviewCard, HomeReviewCardSkeleton } from '@/components/review/HomeReviewCard'

import {
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import {
  SCREEN_FOLLOWING,
  SCREEN_PUBLIC_PROFILE,
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useLatestTrendingReviews } from '@/hooks/useLatestTrendingReviews'
import { isRestaurantUserRouteId } from '@/services/restaurantUserService'
import { pushLoginScreen } from '@/lib/authRoutes'

type ReviewTab = 'trending' | 'foryou'

const TRENDING_LIMIT = 6
const GRID_GAP = 12
const GRID_H_PAD = 16

type HomeReviewsSectionProps = {
  /** Bumps when the parent pull-to-refresh runs so trending refetches. */
  refreshNonce?: number
}

/**
 * Home review discovery — Trending vs For You (`auth-review.md` §1–5).
 * Trending: latest reviews from `get-all-reviews` as 2-column `HomeReviewCard`s.
 */
export function HomeReviewsSection({ refreshNonce = 0 }: HomeReviewsSectionProps) {
  const { isAuthenticated, loading } = useAuth()
  const [tab, setTab] = useState<ReviewTab>('trending')
  const columnWidth = Math.floor(
    (Dimensions.get('window').width - GRID_H_PAD * 2 - GRID_GAP) / 2,
  )
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

  const onOpenAuthor = (authorUserId: string | null | undefined) => {
    void Haptics.selectionAsync()
    if (!isAuthenticated) {
      pushLoginScreen(router, { resume: '/(tabs)' })
      return
    }
    const id = authorUserId?.trim()
    if (id && isRestaurantUserRouteId(id))
      router.push({
        pathname: SCREEN_PUBLIC_PROFILE,
        params: { userId: id },
      })
  }

  return (
    <View className="mt-4 w-full bg-white px-4 pb-8 pt-2">
      <View className="items-center pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Text className="mb-3 text-lg font-normal" style={{ color: TEXT_HEADING }}>
          Reviews
        </Text>
        <View className="flex-row rounded-full bg-gray-100 p-1">
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              setTab('trending')
            }}
          >
            <View
              className="rounded-full px-5 py-2"
              style={
                tab === 'trending'
                  ? {
                      backgroundColor: '#fff',
                      shadowColor: '#000',
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text
                className="text-sm font-normal"
                style={{ color: tab === 'trending' ? BRAND_PRIMARY : TEXT_MUTED }}
              >
                Trending
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              if (!loading && !isAuthenticated) {
                pushLoginScreen(router, { resume: '/(tabs)' })
                return
              }
              setTab('foryou')
            }}
          >
            <View
              className="rounded-full px-5 py-2"
              style={
                tab === 'foryou'
                  ? {
                      backgroundColor: '#fff',
                      shadowColor: '#000',
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text
                className="text-sm font-normal"
                style={{ color: tab === 'foryou' ? BRAND_PRIMARY : TEXT_MUTED }}
              >
                For you
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {tab === 'trending' ? (
        <View className="mt-5 w-full px-0 pb-1">
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
                      onPressAuthor={() => onOpenAuthor(left.author_id)}
                    />
                    {right ? (
                      <HomeReviewCard
                        width={columnWidth}
                        review={right}
                        onPressCard={() => onOpenReview(right.id)}
                        onPressAuthor={() => onOpenAuthor(right.author_id)}
                      />
                    ) : (
                      <View style={{ width: columnWidth }} />
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      ) : (
        <View className="mt-8 items-center px-4">
          {isAuthenticated ? (
            <>
              <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
                Reviews from people you follow will show here. Open the Following tab to explore your
                network.
              </Text>
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  router.push(SCREEN_FOLLOWING)
                }}
                className="mt-4 rounded-full px-8 py-3 active:opacity-90"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Text className="font-normal text-base text-white">Open following</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
                Sign in to see reviews from people you follow.
              </Text>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync()
                  pushLoginScreen(router, { resume: '/(tabs)' })
                }}
                className="mt-4 rounded-full border px-8 py-3 active:opacity-90"
                style={{ borderColor: BRAND_PRIMARY, backgroundColor: '#fef7f0' }}
              >
                <Text className="font-normal text-base" style={{ color: BRAND_PRIMARY }}>
                  Sign in
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  )
}
