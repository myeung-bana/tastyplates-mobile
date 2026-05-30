import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import * as Haptics from 'expo-haptics'
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import RenderHTML from 'react-native-render-html'
import { usePathname, useRouter } from 'expo-router'

import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { restaurantDetailPath, SCREEN_REVIEW_VIEWER } from '@/constants/screens'
import {
  buildDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  formatDayRange,
  formatPriceRange,
  formatRestaurantAddress,
  groupOpeningHours,
  hasValidCoordinates,
  stripHtml,
  todayOpeningHoursSummary,
} from '@/lib/restaurantDetailUtils'
import { useAuth } from '@/hooks/useAuth'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import { copyToClipboard } from '@/lib/copyToClipboard'
import { getMarketingWebOrigin } from '@/lib/webAssets'
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
import { toast } from '@/utils/toast'

import { RestaurantDetailSummary } from '@/components/restaurant/RestaurantDetailSummary'
import { RestaurantRatingMetricsRow } from '@/components/restaurant/RestaurantRatingMetricsRow'

const SAVE_FILLED = '#f97316'
const CHECKIN_FILLED = '#ff7c0a'
const ACTION_INK = '#31343F'

function ActionPill({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string
  icon: AppIconName
  onPress?: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-[50px] border px-4 py-2 active:opacity-90 ${
        disabled ? 'border-gray-200 bg-gray-50 opacity-50' : 'border-gray-300 bg-white'
      }`}
    >
      <AppIcon name={icon} size="sm" color={disabled ? '#9ca3af' : '#6b7280'} />
      <Text
        className={`font-neusans text-sm font-normal ${disabled ? 'text-gray-400' : 'text-gray-900'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function OpeningHoursRow({ openingHours }: { openingHours: string | object | null | undefined }): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const rotateAnim = useRef(new Animated.Value(0)).current
  const grouped = groupOpeningHours(openingHours)
  const summary = todayOpeningHoursSummary(openingHours)
  const isClosed = summary === 'Closed'

  const toggle = () => {
    void Haptics.selectionAsync()
    const next = !expanded
    setExpanded(next)
    Animated.timing(rotateAnim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  if (grouped.length === 0) {
    return (
      <View className="flex-row items-start gap-3">
        <AppIcon name="clock" size={20} color="#6b7280" />
        <View>
          <Text className="font-neusans text-sm text-gray-500">Opening Hours</Text>
          <Text className="font-neusans text-sm text-gray-700">Not available</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-row items-start gap-3">
      <AppIcon name="clock" size={20} color="#6b7280" style={{ marginTop: 2 }} />
      <View className="min-w-0 flex-1">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={toggle}
          className="flex-row items-center justify-between gap-2"
        >
          <View>
            <Text className="font-neusans text-sm text-gray-500">Opening Hours</Text>
            <Text
              className={`font-neusans text-sm font-medium ${
                isClosed ? 'text-gray-500' : 'text-green-600'
              }`}
            >
              {summary}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <AppIcon name="chevron-down" size={16} color="#9ca3af" />
          </Animated.View>
        </Pressable>

        {expanded ? (
          <View className="mt-3 gap-1.5 border-t border-gray-100 pt-3">
            {grouped.map((group, index) => (
              <View key={index} className="flex-row items-center justify-between gap-3 px-2 py-1">
                <Text
                  className={`font-neusans text-sm ${
                    group.isToday ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'
                  }`}
                >
                  {formatDayRange(group.days)}
                </Text>
                <Text
                  className={`font-neusans text-sm ${
                    group.isClosed
                      ? 'text-gray-400'
                      : group.isToday
                        ? 'font-semibold text-gray-900'
                        : 'font-normal text-gray-700'
                  }`}
                >
                  {group.isClosed ? 'Closed' : group.hours}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
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
}: RestaurantDetailViewProps): JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const { width: windowW } = useWindowDimensions()
  const { isAuthenticated } = useAuth()
  const contentWidth = Math.max(280, windowW - 48)

  const address = formatRestaurantAddress(restaurant) ?? undefined
  const about = stripHtml(restaurant.content)
  const phone = restaurant.phone?.trim() ?? ''
  const websiteUrl = restaurant.menu_url?.trim() ?? ''
  const priceDisplay = formatPriceRange(restaurant.price_range_id) ?? 'Not available'
  const googleMapsUrl = buildGoogleMapsPlaceUrl(restaurant)
  const directionsUrl = buildDirectionsUrl(restaurant)
  const coordsValid = hasValidCoordinates(restaurant)

  const overallAvg = summary?.overall_rating_avg ?? restaurant.average_rating
  const overallCount = summary?.overall_review_count ?? restaurant.ratings_count ?? 0
  const authAvg = summary?.authentic_rating_avg ?? null
  const authCount = summary?.authentic_review_count ?? 0

  const [saved, setSaved] = useState<boolean | null>(null)
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null)
  const [engageBusy, setEngageBusy] = useState(false)

  const descriptionSheetRef = useRef<BottomSheetModal>(null)
  const descriptionSnapPoints = useMemo(() => ['55%', '90%'], [])

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

  const renderDescriptionBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  )

  const onShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const url = `${getMarketingWebOrigin()}${restaurantDetailPath(slug)}`
    try {
      const result = await Share.share({
        title: restaurant.title,
        message: `Check out ${restaurant.title} on TastyPlates!`,
        url,
      })
      if (Platform.OS === 'android' && result.action === Share.dismissedAction) {
        return
      }
    } catch {
      const copied = await copyToClipboard(url)
      if (copied) toast.success('Link copied!')
    }
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
      }
    } catch {
      await syncEngagement()
    } finally {
      setEngageBusy(false)
    }
  }

  const openWebsite = () => {
    if (!websiteUrl.startsWith('http')) return
    void Haptics.selectionAsync()
    void Linking.openURL(websiteUrl)
  }

  const openCall = () => {
    if (!phone) return
    void Haptics.selectionAsync()
    void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)
  }

  const openDirections = () => {
    void Haptics.selectionAsync()
    void Linking.openURL(directionsUrl)
  }

  const openMaps = () => {
    if (!googleMapsUrl) return
    void Haptics.selectionAsync()
    void Linking.openURL(googleMapsUrl)
  }

  const visibleReviews = reviews.filter((r) => !r.status || r.status === 'approved')

  return (
  <>
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} />
        ) : undefined
      }
    >
      <RestaurantDetailSummary restaurant={restaurant} />

      {/* Section 3 — Action buttons */}
      <View className="mx-4 mt-6 flex-row flex-wrap gap-2">
        <ActionPill
          label="Website"
          icon="globe"
          disabled={!websiteUrl}
          onPress={websiteUrl ? openWebsite : undefined}
        />
        <ActionPill label="Call" icon="phone" disabled={!phone} onPress={phone ? openCall : undefined} />
        <ActionPill label="Directions" icon="navigation" onPress={openDirections} />
        <Pressable
          accessibilityRole="button"
          disabled={engageBusy}
          onPress={() => void onToggleSave()}
          className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2 active:opacity-90"
        >
          <AppIcon
            name="bookmark"
            active={Boolean(saved)}
            size="sm"
            color={saved ? SAVE_FILLED : ACTION_INK}
          />
          <Text className="font-neusans text-sm font-normal text-gray-900">Save</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={engageBusy}
          onPress={() => void onToggleCheckin()}
          className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2 active:opacity-90"
        >
          <AppIcon
            name="map-pin"
            active={Boolean(checkedIn)}
            size="sm"
            color={checkedIn ? CHECKIN_FILLED : ACTION_INK}
          />
          <Text className="font-neusans text-sm font-normal text-gray-900">Check-in</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share restaurant"
          onPress={() => void onShare()}
          className="h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white active:opacity-90"
        >
          <AppIcon name="share-2" size={16} color="#6b7280" />
        </Pressable>
      </View>

      {/* Section 4 — Ratings */}
      <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white">
        <RestaurantRatingMetricsRow
          overallAvg={overallAvg}
          overallCount={overallCount}
          authenticAvg={authAvg}
          authenticCount={authCount}
          searchAvg={searchAvg}
          searchCount={searchCount}
          palateSlug={palateSlug}
          isAuthenticated={isAuthenticated}
          embedded
        />
      </View>

      {/* Section 5 — Location */}
      <View className="mx-4 mt-4 rounded-2xl bg-white p-6">
        <Text className="mb-4 font-neusans text-lg font-normal text-gray-900">Location</Text>
        {coordsValid && restaurant.latitude != null && restaurant.longitude != null ? (
          <View className="mb-2 overflow-hidden rounded-xl" style={{ height: 256 }}>
            <MapView
              style={{ flex: 1 }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              initialRegion={{
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: restaurant.latitude, longitude: restaurant.longitude }} />
            </MapView>
          </View>
        ) : (
          <View className="mb-2 h-40 flex-row items-center justify-center rounded-xl bg-gray-100">
            <AppIcon name="map-pin" size={20} color="#9ca3af" />
            <Text className="ml-2 font-neusans text-gray-500">Map location not available</Text>
          </View>
        )}

        {address ? (
          <View className="flex-row items-center gap-3 pt-2">
            <AppIcon name="map-pin" size={18} color="#6b7280" />
            <Text className="min-w-0 flex-1 font-neusans text-sm font-normal text-gray-700">{address}</Text>
            {googleMapsUrl ? (
              <Pressable accessibilityRole="button" onPress={openMaps} hitSlop={8}>
                <AppIcon name="external-link" size={16} color={BRAND_PRIMARY} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Section 6 — Restaurant Details */}
      <View className="mx-4 mt-4 rounded-2xl border border-gray-200 bg-white p-6">
        <Text className="mb-4 font-neusans text-lg font-normal text-gray-900">Restaurant Details</Text>
        <View className="gap-4">
          {about ? (
            <View className="border-b border-gray-200 pb-4">
              <Text className="font-neusans text-sm leading-relaxed text-gray-700" numberOfLines={4}>
                {about}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => descriptionSheetRef.current?.present()}
                className="mt-3 items-center rounded-xl bg-gray-100 px-4 py-3 active:opacity-90"
              >
                <Text className="font-neusans text-sm font-medium text-gray-700">See More</Text>
              </Pressable>
            </View>
          ) : null}

          <OpeningHoursRow openingHours={restaurant.opening_hours as string | object | null | undefined} />

          <View className="flex-row items-center gap-3">
            <AppIcon name="phone" size={20} color="#6b7280" />
            <View className="min-w-0 flex-1">
              <Text className="font-neusans text-sm text-gray-500">Phone</Text>
              {phone ? (
                <Pressable accessibilityRole="button" onPress={openCall}>
                  <Text className="font-neusans text-sm font-normal text-gray-700">{phone}</Text>
                </Pressable>
              ) : (
                <Text className="font-neusans text-sm font-normal text-gray-700">Not available</Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <AppIcon name="dollar-sign" size={20} color="#6b7280" />
            <View>
              <Text className="font-neusans text-sm text-gray-500">Price Range</Text>
              <Text className="font-neusans text-sm font-normal text-gray-700">{priceDisplay}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Reviews */}
      <View className="mx-4 mt-4 rounded-2xl bg-white p-4">
        <Text className="mb-3 text-base font-normal" style={{ color: TEXT_HEADING }}>
          Reviews
        </Text>
        {visibleReviews.length === 0 ? (
          <Text className="text-sm" style={{ color: TEXT_MUTED }}>
            No reviews yet. Be the first to write one.
          </Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {visibleReviews.map((item) => (
                <View
                  key={item.id}
                  className="mr-3 w-[200px] overflow-hidden rounded-lg border bg-white p-3"
                  style={{ borderColor: BORDER_SUBTLE, maxWidth: 200 }}
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
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                router.push({
                  pathname: SCREEN_REVIEW_VIEWER,
                  params: { restaurant_uuid: restaurant.uuid },
                })
              }}
              className="mt-3 w-full items-center justify-center rounded-xl border border-gray-300 bg-white py-3 active:opacity-90"
            >
              <Text className="font-neusans text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                View All Reviews ({reviewTotal})
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>

    <BottomSheetModal
      ref={descriptionSheetRef}
      snapPoints={descriptionSnapPoints}
      enablePanDownToClose
      backdropComponent={renderDescriptionBackdrop}
      handleIndicatorStyle={{ backgroundColor: '#d1d5db', width: 40 }}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Text className="mb-3 font-neusans text-lg font-semibold text-gray-900">{restaurant.title}</Text>
        {restaurant.content?.trim() ? (
          <RenderHTML contentWidth={contentWidth} source={{ html: restaurant.content }} />
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  </>
  )
}
