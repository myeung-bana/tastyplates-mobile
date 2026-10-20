import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { usePathname, useRouter } from 'expo-router'

import { ImageFallback } from '@/components/brand/ImageFallback'
import { TpMark } from '@/components/brand/TpMark'
import { RestaurantDetailSummary } from '@/components/restaurant/RestaurantDetailSummary'
import { RestaurantRatingMetricsRow } from '@/components/restaurant/RestaurantRatingMetricsRow'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import {
  GoogleReviewDetailSheet,
  type GoogleReviewDetailSheetHandle,
} from '@/components/review/GoogleReviewDetailSheet'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { AUTH_WALL } from '@/constants/authWalls'
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
  SCREEN_RESTAURANT_REVIEWS,
  SCREEN_REVIEW_VIEWER,
  SCREEN_STUDIO_ADD_REVIEW,
  SCREEN_STUDIO_ADD_REVIEW_WRITE,
  SCREEN_STUDIO_MY_LISTS,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useAuth } from '@/hooks/useAuth'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import {
  buildDirectionsUrl,
  buildGoogleMapsPlaceUrl,
  formatDayRange,
  groupOpeningHours,
  stripHtml,
  todayOpeningHoursSummary,
} from '@/lib/restaurantDetailUtils'
import { firstReviewImageUri } from '@/lib/reviewDisplayUtils'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { shareRestaurantListing } from '@/lib/shareRestaurantListing'
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

/** Save (To-Dine) / Check-in toggle (design S5 + M2): tap to add, tap again to remove. */
function EngageToggle({
  icon,
  on,
  onLabel,
  offLabel,
  onPress,
  disabled,
}: {
  icon: AppIconName
  on: boolean
  onLabel: string
  offLabel: string
  onPress: () => void
  disabled?: boolean
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={offLabel}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center justify-center active:opacity-80"
      style={{
        flex: 1,
        height: 46,
        gap: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: on ? BRAND_PRIMARY : BORDER_SUBTLE,
        backgroundColor: on ? BRAND_PRIMARY_TINT : SURFACE_CARD,
      }}
    >
      <AppIcon name={icon} active={on} size={18} color={on ? BRAND_PRIMARY : TEXT_HEADING} />
      <Text style={{ fontFamily: FONT.heading, fontSize: 15, letterSpacing: 0.6, color: on ? BRAND_PRIMARY_DARK : TEXT_HEADING }}>
        {on ? onLabel : offLabel}
      </Text>
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
  summary: RatingSummaryRow | null
  reviews: RestaurantReviewPreview[]
  reviewTotal: number
  searchAvg?: number | null
  searchCount?: number
  searchMode?: import('@/hooks/useRestaurantScores').SearchScoreMode
  searchGroupName?: string | null
  searchUnlocked?: boolean
  sharedAvg?: number | null
  sharedCount?: number
  sharedUnlocked?: boolean
  isPersonalised?: boolean
  trustSet?: string[]
  cuisineFilterActive?: boolean
  /** Display label of the cuisine filter the user arrived with (banner + "Your Score · X"). */
  cuisineFilterLabel?: string | null
  onClearCuisineFilter?: () => void
  scoresLoading?: boolean
  scoresError?: string | null
  refreshing?: boolean
  onRefresh?: () => void
  /** Floating back button on the photo; the screen hides its native header. */
  onBack?: () => void
  /** Google-only listing — hides TP engagement actions, shows add-review CTA. */
  googlePlaceListing?: { placeId: string; placeName: string; photoAttribution?: string | null }
}

/**
 * Restaurant detail (design S5 / S6), top to bottom: photo carousel · header · Website / Call /
 * Directions · Save and Check-in (Tastyplates listings) · ratings · Write a Review · reviews ·
 * hours, phone, menu, about. Pull to refresh reloads all of it.
 */
export function RestaurantDetailView({
  slug,
  restaurant,
  summary,
  reviews,
  reviewTotal,
  searchAvg = null,
  searchCount = 0,
  searchMode = 'none',
  searchGroupName = null,
  searchUnlocked = false,
  sharedAvg = null,
  sharedCount = 0,
  sharedUnlocked = false,
  isPersonalised = false,
  trustSet = [],
  cuisineFilterActive = false,
  cuisineFilterLabel = null,
  onClearCuisineFilter,
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

  const overallAvg = summary?.overall_rating_avg ?? restaurant.average_rating
  const overallCount = summary?.overall_review_count ?? restaurant.ratings_count ?? 0
  const authAvg = summary?.authentic_rating_avg ?? null
  const authCount = summary?.authentic_review_count ?? 0

  const hours = restaurant.opening_hours as string | object | null | undefined
  const groupedHours = groupOpeningHours(hours)
  const todayHours = todayOpeningHoursSummary(hours)
  const weekHours = groupedHours
    .map((g) => `${formatDayRange(g.days)} ${g.isClosed ? 'Closed' : g.hours}`)
    .join(' · ')

  const [saved, setSaved] = useState<boolean | null>(null)
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null)
  const [engageBusy, setEngageBusy] = useState(false)
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const googleReviewSheetRef = useRef<GoogleReviewDetailSheetHandle>(null)

  const syncEngagement = useCallback(async () => {
    if (googlePlaceListing || !slug.trim() || !isAuthenticated) {
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
  }, [googlePlaceListing, isAuthenticated, slug])

  useEffect(() => {
    void syncEngagement()
  }, [syncEngagement])

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

  const promptSignInForEngagement = () => {
    void Haptics.selectionAsync()
    pushLoginScreen(router, { resume: coerceResumeHref(pathname), wall: AUTH_WALL.saveCheckin })
  }

  const onToggleSave = async () => {
    if (!isAuthenticated) return promptSignInForEngagement()
    setEngageBusy(true)
    await Haptics.selectionAsync()
    try {
      const status = await toggleFavoriteBySlug(slug)
      setSaved(status === 'saved')
      toast.action(status === 'saved' ? 'Saved to To-Dine' : 'Removed from To-Dine', {
        label: 'View',
        onPress: () => router.push({ pathname: SCREEN_STUDIO_MY_LISTS, params: { tab: 'todine' } }),
      })
    } catch {
      await syncEngagement()
    } finally {
      setEngageBusy(false)
    }
  }

  const onToggleCheckin = async () => {
    if (!isAuthenticated) return promptSignInForEngagement()
    setEngageBusy(true)
    await Haptics.selectionAsync()
    try {
      const status = await toggleCheckinBySlug(slug)
      setCheckedIn(status === 'checkedin')
      if (status === 'checkedin') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
      toast.action(status === 'checkedin' ? `Checked in at ${restaurant.title}` : 'Check-in removed', {
        label: 'View',
        onPress: () => router.push({ pathname: SCREEN_STUDIO_MY_LISTS, params: { tab: 'checkins' } }),
      })
    } catch {
      await syncEngagement()
    } finally {
      setEngageBusy(false)
    }
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
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_PRIMARY} /> : undefined
      }
    >
      <RestaurantDetailSummary
        restaurant={restaurant}
        googleOnly={Boolean(googlePlaceListing)}
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

      {googlePlaceListing ? null : (
        <View className="flex-row" style={{ gap: 10, paddingHorizontal: 20, paddingTop: 20 }}>
          <EngageToggle
            icon="bookmark"
            on={Boolean(saved)}
            onLabel="Saved"
            offLabel="Save"
            disabled={engageBusy}
            onPress={() => void onToggleSave()}
          />
          <EngageToggle
            icon="map-pin"
            on={Boolean(checkedIn)}
            onLabel="Checked in"
            offLabel="Check-in"
            disabled={engageBusy}
            onPress={() => void onToggleCheckin()}
          />
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <RestaurantRatingMetricsRow
          overallAvg={overallAvg}
          overallCount={overallCount}
          authenticAvg={authAvg}
          authenticCount={authCount}
          searchAvg={searchAvg}
          searchCount={searchCount}
          searchMode={searchMode}
          searchGroupName={searchGroupName}
          searchUnlocked={searchUnlocked}
          isAuthenticated={isAuthenticated}
          isPersonalised={isPersonalised}
          trustSet={trustSet}
          sharedAvg={sharedAvg}
          sharedCount={sharedCount}
          sharedUnlocked={sharedUnlocked}
          embedded
          filterLabel={cuisineFilterActive ? cuisineFilterLabel : null}
          onClearFilter={onClearCuisineFilter}
        />
        {scoresError ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: '#b45309' }}>{scoresError}</Text>
        ) : scoresLoading ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>Updating scores…</Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        {googlePlaceListing ? (
          <View style={{ borderRadius: 16, backgroundColor: SURFACE_FOG, padding: 18, gap: 10 }}>
            <TpMark size={26} />
            <Text style={{ fontFamily: FONT.heading, fontSize: 18, lineHeight: 23, color: TEXT_HEADING }}>
              Be the first to review {restaurant.title}
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_MUTED }}>
              Your review adds it to Tastyplates and starts its palate scores.
            </Text>
            <Button onPress={openWriteReview} style={{ marginTop: 4 }}>
              Write a review
            </Button>
          </View>
        ) : (
          <Button onPress={openWriteReview}>Write a Review</Button>
        )}
      </View>

      <View style={{ paddingTop: 28, gap: 12 }}>
        <View className="flex-row items-baseline justify-between" style={{ paddingHorizontal: 20 }}>
          <Eyebrow>{googlePlaceListing ? 'Google reviews' : 'Reviews'}</Eyebrow>
          {visibleReviews.length > 0 && (!googlePlaceListing || openMaps) ? (
            <Pressable accessibilityRole="button" onPress={openAllReviews} hitSlop={8}>
              <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY_DARK }}>
                {googlePlaceListing ? 'Open in Google Maps' : `View All Reviews${reviewTotal ? ` (${reviewTotal})` : ''}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {visibleReviews.length === 0 ? (
          <Text style={{ paddingHorizontal: 20, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED }}>
            {googlePlaceListing ? 'No Google reviews for this place yet.' : 'No reviews yet. Be the first to write one.'}
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
