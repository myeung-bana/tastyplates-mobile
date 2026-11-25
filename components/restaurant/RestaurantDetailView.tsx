import { useRef, useState } from 'react'
import { Animated, Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { usePathname, useRouter } from 'expo-router'

import { ImageFallback } from '@/components/brand/ImageFallback'
import { ReadingCard } from '@/components/reading/ReadingCard'
import { RestaurantDetailSummary } from '@/components/restaurant/RestaurantDetailSummary'
import { RestaurantRatingMetricsRow } from '@/components/restaurant/RestaurantRatingMetricsRow'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import {
  GoogleReviewDetailSheet,
  type GoogleReviewDetailSheetHandle,
} from '@/components/review/GoogleReviewDetailSheet'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_RESTAURANT_READING,
  SCREEN_RESTAURANT_REVIEWS,
  SCREEN_REVIEW_VIEWER,
  SCREEN_STUDIO_ADD_REVIEW,
  SCREEN_STUDIO_ADD_REVIEW_WRITE,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useAuth } from '@/hooks/useAuth'
import { useReadingCardState } from '@/hooks/useReadingCardState'
import { useRestaurantEngagement } from '@/hooks/useRestaurantEngagement'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import {
  buildDirectionsUrl,
  buildRestaurantImageGallery,
  buildGoogleMapsPlaceUrl,
  formatDayRange,
  groupOpeningHours,
  stripHtml,
  todayOpeningHoursSummary,
} from '@/lib/restaurantDetailUtils'
import { firstReviewImageUri } from '@/lib/reviewDisplayUtils'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { shareRestaurantListing } from '@/lib/shareRestaurantListing'
import type { RestaurantScores } from '@/services/readingService'
import type { RestaurantDetailRow, RestaurantReviewPreview } from '@/services/restaurantDetailService'

const REVIEW_CARD_WIDTH = 200

function Eyebrow({ children }: { children: string }): JSX.Element {
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: FONT.heading, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
    >
      {children}
    </Text>
  )
}

/** Website / Call / Directions — 48pt outlined circle with a label underneath (design S5). */
function ActionCircle({
  label,
  icon,
  onPress,
}: {
  label: string
  icon: AppIconName
  onPress?: () => void
}): JSX.Element {
  const disabled = !onPress
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress?.()
      }}
      className="items-center active:opacity-70"
      style={{ flex: 1, gap: 8, opacity: disabled ? 0.4 : 1 }}
    >
      <View
        className="items-center justify-center"
        style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: BORDER_SUBTLE }}
      >
        <AppIcon name={icon} size={20} color={TEXT_HEADING} />
      </View>
      <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>{label}</Text>
    </Pressable>
  )
}

/** Save (To-Dine) / Check-in: 52pt outlined circle beside Write a Review; orange when on. */
function EngageCircle({
  icon,
  on,
  label,
  onPress,
  disabled,
}: {
  icon: AppIconName
  on: boolean
  label: string
  onPress: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="items-center justify-center active:opacity-80"
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: on ? BRAND_PRIMARY : BORDER_SUBTLE,
        backgroundColor: on ? BRAND_PRIMARY_TINT : SURFACE_CARD,
      }}
    >
      <AppIcon name={icon} active={on} size={20} color={on ? BRAND_PRIMARY : TEXT_HEADING} />
    </Pressable>
  )
}

/** One review in the horizontal row (design S5): photo, author + rating, title. */
function ReviewCard({
  review,
  google,
  onPress,
}: {
  review: RestaurantReviewPreview
  google: boolean
  onPress: () => void
}): JSX.Element {
  const img = firstReviewImageUri(review.images, '')
  const author = resolveReviewAuthorLabel(review.AuthorProfile, google ? 'Google user' : 'Member')
  const title = stripHtml(review.title ?? '').trim() || stripHtml(review.content ?? '').trim()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review by ${author}${review.rating ? `, ${review.rating} stars` : ''}`}
      onPress={onPress}
      className="active:opacity-90"
      style={{ width: REVIEW_CARD_WIDTH, gap: 8 }}
    >
      {img ? (
        <Image source={{ uri: img }} style={{ width: REVIEW_CARD_WIDTH, height: 140, borderRadius: 14, backgroundColor: SURFACE_FOG }} />
      ) : google ? (
        <View
          className="items-center justify-center"
          style={{ width: REVIEW_CARD_WIDTH, height: 140, borderRadius: 14, backgroundColor: SURFACE_FOG }}
        >
          <Text style={{ fontFamily: FONT.heading, fontSize: 28, color: TEXT_TERTIARY }}>G</Text>
        </View>
      ) : (
        <ImageFallback style={{ width: REVIEW_CARD_WIDTH, height: 140, borderRadius: 14 }} />
      )}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <ProfileAvatarImage size={20} avatarUrl={resolveReviewAuthorAvatarUrl(review.AuthorProfile)} style={{ backgroundColor: BORDER_SUBTLE }} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>
          {author}
        </Text>
        {review.rating ? (
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: BRAND_PRIMARY_DARK }}>★ {review.rating.toFixed(1)}</Text>
        ) : null}
      </View>
      {title ? (
        <Text numberOfLines={2} style={{ fontFamily: FONT.heading, fontSize: 15, lineHeight: 19, color: TEXT_HEADING }}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  )
}

/** Details list row (design S5): icon, primary line, optional secondary line. */
function DetailRow({
  icon,
  primary,
  secondary,
  onPress,
}: {
  icon: AppIconName
  primary: string
  secondary?: string | null
  onPress?: () => void
}): JSX.Element {
  const body = (
    <>
      <AppIcon name={icon} size={18} color={TEXT_MUTED} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 14, lineHeight: 18, color: TEXT_HEADING }}>{primary}</Text>
        {secondary ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 18, color: TEXT_MUTED }}>{secondary}</Text>
        ) : null}
      </View>
    </>
  )
  const style = { flexDirection: 'row' as const, gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }
  if (!onPress) return <View style={style}>{body}</View>
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="active:opacity-70" style={style}>
      {body}
    </Pressable>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export interface RestaurantDetailViewProps {
  slug: string
  restaurant: RestaurantDetailRow
  reviews: RestaurantReviewPreview[]
  reviewTotal: number
  /** `restaurants-v2/get-restaurant-scores`; null while loading or for an unlisted place. */
  scores?: RestaurantScores | null
  scoresLoading?: boolean
  scoresError?: string | null
  refreshing?: boolean
  onRefresh?: () => void
  /** Floating back button on the photo; the screen hides its native header. */
  onBack?: () => void
  /**
   * A Google place with no Tastyplates row yet. Same page and layout; Save / Check-in create the
   * restaurant first, reviews come from the place, and the reading waits for reviews.
   */
  googlePlaceListing?: { placeId: string; placeName: string; photoAttribution?: string | null; place: PlacesDetailsResult }
}

/**
 * Restaurant detail — one template for every restaurant, top to bottom: photo carousel · header ·
 * Website / Call / Directions · Write a Review with Save and Check-in · ratings · personalised
 * reading card · reviews · hours, phone, menu, about. Pull to refresh reloads all of it.
 */
export function RestaurantDetailView({
  slug,
  restaurant,
  reviews,
  reviewTotal,
  scores = null,
  scoresLoading = false,
  scoresError = null,
  refreshing = false,
  onRefresh,
  onBack,
  googlePlaceListing,
}: RestaurantDetailViewProps): JSX.Element {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { isAuthenticated } = useAuth()
  // Status-bar backdrop fades in once the photo has scrolled away.
  const scrollY = useRef(new Animated.Value(0)).current
  const scrimOpacity = scrollY.interpolate({ inputRange: [220, 280], outputRange: [0, 1], extrapolate: 'clamp' })

  const about = stripHtml(restaurant.content)
  const phone = restaurant.phone?.trim() ?? ''
  const websiteUrl = restaurant.menu_url?.trim() ?? ''
  const googleMapsUrl = buildGoogleMapsPlaceUrl(restaurant)
  const directionsUrl = buildDirectionsUrl(restaurant)


  const hours = restaurant.opening_hours as string | object | null | undefined
  const groupedHours = groupOpeningHours(hours)
  const todayHours = todayOpeningHoursSummary(hours)
  const weekHours = groupedHours
    .map((g) => `${formatDayRange(g.days)} ${g.isClosed ? 'Closed' : g.hours}`)
    .join(' · ')

  const [aboutExpanded, setAboutExpanded] = useState(false)
  const googleReviewSheetRef = useRef<GoogleReviewDetailSheetHandle>(null)
  const engagement = useRestaurantEngagement(slug, restaurant.title, googlePlaceListing?.place ?? null)
  const reading = useReadingCardState(googlePlaceListing ? null : restaurant.uuid)

  const openWriteReview = () => {
    void Haptics.selectionAsync()
    if (googlePlaceListing) {
      router.push({
        pathname: SCREEN_STUDIO_ADD_REVIEW,
        params: { prefill_place_id: googlePlaceListing.placeId, prefill_name: googlePlaceListing.placeName },
      })
      return
    }
    if (!slug.trim()) return
    if (!isAuthenticated) {
      pushLoginScreen(router, { resume: coerceResumeHref(pathname) })
      return
    }
    router.push({ pathname: SCREEN_STUDIO_ADD_REVIEW_WRITE, params: { slug } })
  }

  const openReading = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: SCREEN_RESTAURANT_READING,
      params: {
        uuid: restaurant.uuid,
        title: restaurant.title,
        slug,
        image: buildRestaurantImageGallery(restaurant)[0] ?? '',
      },
    })
  }

  const handleRefresh = () => {
    onRefresh?.()
    void engagement.refresh()
    void reading.reload()
  }

  const openUrl = (url: string) => void Linking.openURL(url)
  const openWebsite = websiteUrl.startsWith('http') ? () => openUrl(websiteUrl) : undefined
  const openCall = phone ? () => openUrl(`tel:${phone.replace(/\s/g, '')}`) : undefined
  const openDirections = () => openUrl(directionsUrl)
  const openMaps = googleMapsUrl ? () => openUrl(googleMapsUrl) : undefined

  const onShare = () =>
    void shareRestaurantListing({
      title: restaurant.title,
      slug,
      googlePlaceId: googlePlaceListing?.placeId ?? null,
    })

  const visibleReviews = reviews.filter((r) => !r.status || r.status === 'approved')

  const openReview = (item: RestaurantReviewPreview) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (googlePlaceListing) {
      // Google snippets can't be liked or commented on (design R5): short sheet, then Maps.
      googleReviewSheetRef.current?.present({
        authorName: resolveReviewAuthorLabel(item.AuthorProfile, 'Google user'),
        avatarUrl: resolveReviewAuthorAvatarUrl(item.AuthorProfile),
        rating: item.rating,
        content: item.content,
        timeLabel: item.relativeTimeLabel ?? undefined,
        authorUrl: item.googleAuthorUrl ?? undefined,
      })
      return
    }
    router.push({ pathname: SCREEN_REVIEW_VIEWER, params: { reviewId: item.id } })
  }

  const openAllReviews = () => {
    void Haptics.selectionAsync()
    if (googlePlaceListing) {
      openMaps?.()
      return
    }
    router.push({
      pathname: SCREEN_RESTAURANT_REVIEWS,
      params: { restaurant_uuid: restaurant.uuid, restaurant_title: restaurant.title, restaurant_slug: restaurant.slug },
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
    <Animated.ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND_PRIMARY} /> : undefined
      }
    >
      <RestaurantDetailSummary
        restaurant={restaurant}
        onBack={onBack}
        onShare={onShare}
      />

      {googlePlaceListing?.photoAttribution ? (
        <Text style={{ marginHorizontal: 20, marginTop: 8, fontFamily: FONT.body, fontSize: 11, color: TEXT_TERTIARY }}>
          Photo: {googlePlaceListing.photoAttribution}
        </Text>
      ) : null}

      <View className="flex-row" style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <ActionCircle label="Website" icon="globe" onPress={openWebsite} />
        <ActionCircle label="Call" icon="phone" onPress={openCall} />
        <ActionCircle label="Directions" icon="navigation" onPress={openDirections} />
      </View>

      {/* Write a Review is the main action; Save (To-Dine) and Check-in sit beside it. */}
      <View className="flex-row items-center" style={{ gap: 10, paddingHorizontal: 20, paddingTop: 20 }}>
        <Button onPress={openWriteReview} style={{ flex: 1 }}>
          Write a Review
        </Button>
        <EngageCircle
          icon="bookmark"
          on={engagement.saved}
          label={engagement.saved ? 'Saved to To-Dine' : 'Save to To-Dine'}
          disabled={engagement.busy}
          onPress={() => void engagement.toggleSave()}
        />
        <EngageCircle
          icon="map-pin"
          on={engagement.checkedIn}
          label={engagement.checkedIn ? 'Checked in' : 'Check in'}
          disabled={engagement.busy}
          onPress={() => void engagement.toggleCheckin()}
        />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <RestaurantRatingMetricsRow
          scores={scores}
          fallbackOverall={scores ? null : { avg: restaurant.average_rating, count: restaurant.ratings_count ?? 0 }}
          isAuthenticated={isAuthenticated}
        />
        {scoresError ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: '#b45309' }}>{scoresError}</Text>
        ) : scoresLoading && !scores ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>Updating scores…</Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <ReadingCard
          restaurantTitle={restaurant.title}
          state={reading.state?.state ?? null}
          updatedAt={reading.state?.updated_at}
          onRead={openReading}
          onView={openReading}
          onSignIn={() => pushLoginScreen(router, { resume: coerceResumeHref(pathname) })}
          onSetPalates={() => router.push({ pathname: SCREEN_EDIT_PROFILE, params: { open: 'palates' } })}
          onWriteReview={openWriteReview}
        />
      </View>

      <View style={{ paddingTop: 28, gap: 12 }}>
        <View className="flex-row items-baseline justify-between" style={{ paddingHorizontal: 20 }}>
          <Eyebrow>Reviews</Eyebrow>
          {visibleReviews.length > 0 && (!googlePlaceListing || openMaps) ? (
            <Pressable accessibilityRole="button" onPress={openAllReviews} hitSlop={8}>
              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY_DARK }}>
                {`View All Reviews${reviewTotal ? ` (${reviewTotal})` : ''}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {visibleReviews.length === 0 ? (
          <Text style={{ paddingHorizontal: 20, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>
            No reviews yet. Be the first to write one.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
          >
            {visibleReviews.map((item) => (
              <ReviewCard key={item.id} review={item} google={Boolean(googlePlaceListing)} onPress={() => openReview(item)} />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
        <View style={{ paddingBottom: 4 }}>
          <Eyebrow>Details</Eyebrow>
        </View>
        <DetailRow
          icon="clock"
          primary={
            groupedHours.length === 0
              ? 'Hours not available'
              : todayHours === 'Closed'
                ? 'Closed today'
                : todayHours.replace(/^Open\s*·\s*/, 'Open today · ')
          }
          secondary={weekHours || null}
        />
        {phone ? <DetailRow icon="phone" primary={phone} onPress={openCall} /> : null}
        {websiteUrl ? <DetailRow icon="book-open" primary={`Menu · ${hostOf(websiteUrl)}`} onPress={openWebsite} /> : null}
        {about ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint={aboutExpanded ? 'Collapses the description' : 'Expands the description'}
            onPress={() => setAboutExpanded((v) => !v)}
          >
            <Text
              numberOfLines={aboutExpanded ? undefined : 4}
              style={{ marginTop: 14, fontFamily: FONT.body, fontSize: 14, lineHeight: 22, color: TEXT_HEADING }}
            >
              {about}
            </Text>
          </Pressable>
        ) : null}
      </View>

    </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: SURFACE_CARD,
          opacity: scrimOpacity,
          borderBottomWidth: 1,
          borderBottomColor: BORDER_SUBTLE,
        }}
      />

      {googlePlaceListing ? (
        <GoogleReviewDetailSheet ref={googleReviewSheetRef} onViewOnGoogleMaps={openMaps} />
      ) : null}
    </View>
  )
}
