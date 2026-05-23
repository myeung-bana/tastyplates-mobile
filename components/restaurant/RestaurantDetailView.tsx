import { useCallback, useEffect, useState } from 'react'
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { usePathname, useRouter } from 'expo-router'

import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_REVIEW_VIEWER, SCREEN_STUDIO_ADD_REVIEW_WRITE } from '@/constants/screens'
import {
  formatOpeningHoursSummary,
  formatRestaurantAddress,
  mapsDirectionsUrl,
  stripHtml,
} from '@/lib/restaurantDetailUtils'
import { useAuth } from '@/hooks/useAuth'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import type {
  RatingSummaryRow,
  RestaurantDetailRow,
  RestaurantReviewPreview,
} from '@/services/restaurantDetailService'
import {
  getCheckinStatus,
  getFavoriteStatus,
  toggleCheckinBySlug,
  toggleFavoriteBySlug,
} from '@/services/restaurantEngagementService'

import { RestaurantDetailSummary } from '@/components/restaurant/RestaurantDetailSummary'
import { RestaurantRatingMetricsRow } from '@/components/restaurant/RestaurantRatingMetricsRow'

function formatRating(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n) || n <= 0) return '—'
  return n.toFixed(1)
}

export interface RestaurantDetailViewProps {
  slug: string
  restaurant: RestaurantDetailRow
  summary: RatingSummaryRow | null
  reviews: RestaurantReviewPreview[]
  reviewTotal: number
  palateSlug?: string | null
  searchAvg?: number | null
  searchCount?: number
  refreshing?: boolean
  onRefresh?: () => void
}

export function RestaurantDetailView({
  slug,
  restaurant,
  summary,
  reviews,
  reviewTotal,
  palateSlug = null,
  searchAvg = null,
  searchCount = 0,
  refreshing = false,
  onRefresh,
}: RestaurantDetailViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const address = formatRestaurantAddress(restaurant)
  const about = stripHtml(restaurant.content)
  const hoursLine = formatOpeningHoursSummary(restaurant.opening_hours)

  const overallAvg = summary?.overall_rating_avg ?? restaurant.average_rating
  const overallCount = summary?.overall_review_count ?? restaurant.ratings_count ?? 0
  const authAvg = summary?.authentic_rating_avg ?? null
  const authCount = summary?.authentic_review_count ?? 0

  const [saved, setSaved] = useState<boolean | null>(null)
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null)
  const [engageBusy, setEngageBusy] = useState(false)

  const syncEngagement = useCallback(async () => {
    if (!isAuthenticated) {
      setSaved(null)
      setCheckedIn(null)
      return
    }
    try {
      const [f, c] = await Promise.all([getFavoriteStatus(slug), getCheckinStatus(slug)])
      setSaved(f === 'saved')
      setCheckedIn(c === 'checkedin')
    } catch {
      setSaved(null)
      setCheckedIn(null)
    }
  }, [isAuthenticated, slug])

  useEffect(() => {
    void syncEngagement()
  }, [syncEngagement])

  const onShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await Share.share({
        message: `${restaurant.title} — Tastyplates (${restaurant.slug})`,
      })
    } catch {
      /* ignore */
    }
  }

  const onWriteReview = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: SCREEN_STUDIO_ADD_REVIEW_WRITE,
      params: { slug },
    })
  }

  const promptSignInForEngagement = () => {
    void Haptics.selectionAsync()
    pushLoginScreen(router, {
      resume: coerceResumeHref(pathname),
    })
  }

  const onToggleSave = async () => {
    if (!isAuthenticated) {
      promptSignInForEngagement()
      return
    }
    setEngageBusy(true)
    await Haptics.selectionAsync()
    try {
      const status = await toggleFavoriteBySlug(slug)
      setSaved(status === 'saved')
      await Haptics.selectionAsync()
    } catch {
      await syncEngagement()
    } finally {
      setEngageBusy(false)
    }
  }

  const onToggleCheckin = async () => {
    if (!isAuthenticated) {
      promptSignInForEngagement()
      return
    }
    setEngageBusy(true)
    await Haptics.selectionAsync()
    try {
      const status = await toggleCheckinBySlug(slug)
      setCheckedIn(status === 'checkedin')
      if (status === 'checkedin') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        await Haptics.selectionAsync()
      }
    } catch {
      await syncEngagement()
    } finally {
      setEngageBusy(false)
    }
  }

  const openDirections = () => {
    const lat = restaurant.latitude
    const lng = restaurant.longitude
    if (lat == null || lng == null) return
    void Haptics.selectionAsync()
    const url = mapsDirectionsUrl(lat, lng)
    void Linking.openURL(url)
  }

  const visibleReviews = reviews.filter((r) => !r.status || r.status === 'approved')

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />
        ) : undefined
      }
    >
      <RestaurantDetailSummary
        restaurant={restaurant}
        overallAvg={overallAvg}
        overallCount={overallCount}
        palateSlug={palateSlug}
        onShare={() => void onShare()}
      />

      <View
        className="flex-row flex-wrap items-stretch gap-3 border-t px-4 py-4"
        style={{ borderTopColor: BORDER_SUBTLE }}
      >
        <Pressable
          onPress={onWriteReview}
          className="min-w-[140px] flex-1 items-center justify-center rounded-[50px] py-3 active:opacity-90"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Text className="text-sm font-normal text-white">Write a review</Text>
        </Pressable>
        <Pressable
          disabled={engageBusy}
          onPress={() => void onToggleSave()}
          className="h-12 w-12 items-center justify-center rounded-full border bg-white active:opacity-90"
          style={{ borderColor: BORDER_SUBTLE }}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? BRAND_PRIMARY : TEXT_HEADING}
          />
        </Pressable>
        <Pressable
          disabled={engageBusy}
          onPress={() => void onToggleCheckin()}
          className="h-12 w-12 items-center justify-center rounded-full border bg-white active:opacity-90"
          style={{ borderColor: BORDER_SUBTLE }}
        >
          <Ionicons
            name={checkedIn ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={24}
            color={checkedIn ? BRAND_PRIMARY : TEXT_HEADING}
          />
        </Pressable>
      </View>

      <RestaurantRatingMetricsRow
        overallAvg={overallAvg}
        overallCount={overallCount}
        authenticAvg={authAvg}
        authenticCount={authCount}
        searchAvg={searchAvg}
        searchCount={searchCount}
        palateSlug={palateSlug}
        isAuthenticated={isAuthenticated}
      />

      <View className="border-t px-4 py-4" style={{ borderTopColor: BORDER_SUBTLE }}>
        <Text className="mb-3 text-base font-normal" style={{ color: TEXT_HEADING }}>
          Reviews
        </Text>
        {visibleReviews.length === 0 ? (
          <Text className="text-sm" style={{ color: TEXT_MUTED }}>
            No reviews yet. Be the first to write one.
          </Text>
        ) : (
          <>
            <View className="-mx-4 flex-row gap-3 pb-1" style={{ paddingHorizontal: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {visibleReviews.map((item) => (
                  <View
                    key={item.id}
                    className="mr-3 w-[200px] overflow-hidden rounded-lg border bg-white p-3"
                    style={{
                      borderColor: BORDER_SUBTLE,
                      maxWidth: 200,
                    }}
                  >
                    <Text className="text-sm font-normal" style={{ color: TEXT_HEADING }} numberOfLines={2}>
                      {item.title?.trim() || 'Review'}
                    </Text>
                    <View className="mt-1">
                      <RatingDisplay size="xs" value={item.rating} />
                    </View>
                    <Text className="mt-2 text-xs leading-snug" style={{ color: TEXT_BODY }} numberOfLines={4}>
                      {stripHtml(item.content ?? '').slice(0, 220)}
                      {(item.content?.length ?? 0) > 220 ? '…' : ''}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                router.push({
                  pathname: SCREEN_REVIEW_VIEWER,
                  params: { restaurant_uuid: restaurant.uuid },
                })
              }}
              className="mt-3 self-end active:opacity-80"
            >
              <Text className="text-sm" style={{ color: BRAND_PRIMARY }}>
                View all ({reviewTotal})
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View className="border-t px-4 py-4" style={{ borderTopColor: BORDER_SUBTLE }}>
        <Text className="mb-3 text-base font-normal" style={{ color: TEXT_HEADING }}>
          Location
        </Text>
        {restaurant.latitude != null && restaurant.longitude != null ? (
          <Pressable
            onPress={openDirections}
            className="mb-3 overflow-hidden rounded-2xl bg-[#f8f9fa] active:opacity-90"
            style={{ height: 140, borderWidth: 1, borderColor: BORDER_SUBTLE }}
          >
            <View className="flex-1 items-center justify-center px-4">
              <Ionicons name="map-outline" size={36} color={BRAND_PRIMARY} />
              <Text className="mt-2 text-center text-sm" style={{ color: TEXT_BODY }}>
                Open in Maps
              </Text>
              <Text className="mt-1 text-center text-xs" style={{ color: TEXT_MUTED }}>
                Tap for directions
              </Text>
            </View>
          </Pressable>
        ) : null}

        {address ? (
          <View className="mb-3 flex-row items-start gap-2">
            <Ionicons name="location-outline" size={18} color={BRAND_PRIMARY} style={{ marginTop: 2 }} />
            <Text className="min-w-0 flex-1 text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
              {address}
            </Text>
          </View>
        ) : null}

        {restaurant.phone?.trim() ? (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              void Linking.openURL(`tel:${restaurant.phone!.replace(/\s/g, '')}`)
            }}
            className="mb-3 flex-row items-center gap-2 active:opacity-80"
          >
            <Ionicons name="call-outline" size={18} color={BRAND_PRIMARY} />
            <Text className="text-sm" style={{ color: TEXT_BODY }}>
              {restaurant.phone}
            </Text>
          </Pressable>
        ) : null}

        {hoursLine ? (
          <Text className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
            Hours: {hoursLine}
          </Text>
        ) : null}
      </View>

      {about ? (
        <View className="border-t px-4 py-4" style={{ borderTopColor: BORDER_SUBTLE }}>
          <Text className="mb-2 text-base font-normal" style={{ color: TEXT_HEADING }}>
            About
          </Text>
          <Text className="text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
            {about}
          </Text>
        </View>
      ) : null}

      {restaurant.menu_url?.trim() ? (
        <View className="border-t px-4 py-4" style={{ borderTopColor: BORDER_SUBTLE }}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              const u = restaurant.menu_url!.trim()
              if (u.startsWith('http')) void Linking.openURL(u)
            }}
            className="flex-row items-center gap-2 active:opacity-80"
          >
            <Ionicons name="restaurant-outline" size={20} color={BRAND_PRIMARY} />
            <Text className="text-sm" style={{ color: BRAND_PRIMARY }}>
              View menu
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}
