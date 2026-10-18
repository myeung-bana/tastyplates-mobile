import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  Animated,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { usePathname, useRouter } from 'expo-router'

import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { ImageFallback } from '@/components/brand/ImageFallback'
import { BORDER_SUBTLE, BRAND_PRIMARY, SURFACE_CARD, SURFACE_FOG, TEXT_MUTED } from '@/constants/brand'
import { useAuth } from '@/hooks/useAuth'
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import { AUTH_WALL } from '@/constants/authWalls'
import { coerceRatingNumber, hasDisplayableRating } from '@/lib/ratingDisplayUtils'
import {
  getFavoriteStatus,
  toggleFavoriteBySlug,
} from '@/services/restaurantEngagementService'
import {
  normalizeCategoryList,
  normalizeCuisineList,
  type RestaurantListCategory,
  type RestaurantListCuisine,
} from '@/services/restaurantsV2Service'
import { FONT, bodyFont } from '@/constants/typography'

const TEXT_COLOR = '#31343F'

export interface RestaurantBrowseCardProps {
  title: string
  imageUrl?: string | null
  /** Formatted `street, city` (see `formatRestaurantCardAddress`). */
  subtitle?: string | null
  rating?: number | null
  reviewCount?: number | null
  /** Restaurant slug — wishlist toggle + comment navigation. */
  slug?: string
  /** Cuisine pills overlaid on the image (maps from API `cuisines`). */
  listingCategories?: RestaurantListCuisine[]
  /** Establishment categories; parent rows render as orange dot-separated labels. */
  categories?: RestaurantListCategory[]
  initialSavedStatus?: boolean | null
  onWishlistChange?: (isSaved: boolean) => void
  onPress: () => void
  /** Opens reviews / detail; defaults to `onPress` when omitted. */
  onCommentPress?: () => void
  containerStyle?: StyleProp<ViewStyle>
  /** When false, hides `(N)` review count beside the score (e.g. home Recommended row). */
  showReviewCount?: boolean
  /** Palate-match Search score when `?palate=` is active on browse. */
  searchPalateRating?: number | null
  searchPalateReviewCount?: number | null
  /** When `palate-match`, hides overall rating and shows match score only. */
  ratingMode?: 'overall' | 'palate-match'
  /** `compact` — Home carousel tile (design H1): 152px photo, no save/comment overlays. */
  variant?: 'default' | 'compact'
}

function buildAccessibilityLabel(
  title: string,
  subtitle: string | null | undefined,
  overallRating: number | null,
  reviewCount: number | null | undefined,
  listingCategories: RestaurantListCuisine[],
): string {
  const parts = [title]
  if (subtitle?.trim()) parts.push(subtitle.trim())
  if (hasDisplayableRating(overallRating)) {
    parts.push(
      reviewCount != null && reviewCount > 0
        ? `rated ${overallRating} out of 5, ${reviewCount} reviews`
        : `rated ${overallRating} out of 5`,
    )
  }
  if (listingCategories.length > 0) {
    parts.push(`cuisines: ${listingCategories.map((c) => c.name).join(', ')}`)
  }
  return parts.join(', ')
}

/** Outlined cuisine chip under the card text (brand v1.0). */
function CuisinePill({ label }: { label: string }): JSX.Element {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 50,
        borderWidth: 1.5,
        borderColor: BORDER_SUBTLE,
        backgroundColor: SURFACE_CARD,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: bodyFont('400'),
          color: TEXT_COLOR,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

function ActionCircle({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void
  disabled?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      style={{
        borderRadius: 999,
        padding: 8,
        backgroundColor: '#fff',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </Pressable>
  )
}

/**
 * Restaurant browse tile — visual parity with web `RestaurantCard` (transparent card, contain image, cuisine overlay).
 */
export function RestaurantBrowseCard({
  title,
  imageUrl,
  subtitle,
  rating,
  reviewCount,
  slug,
  listingCategories,
  categories,
  initialSavedStatus,
  onWishlistChange,
  onPress,
  onCommentPress,
  containerStyle,
  showReviewCount = true,
  searchPalateRating,
  searchPalateReviewCount,
  ratingMode = 'overall',
  variant = 'default',
}: RestaurantBrowseCardProps) {
  const uri = resolveEffectiveFeaturedImageUrl(imageUrl)
  const [imageFailed, setImageFailed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const { width: screenWidth } = useWindowDimensions()

  const [saved, setSaved] = useState<boolean | null>(
    typeof initialSavedStatus === 'boolean' ? initialSavedStatus : null,
  )
  const [wishlistBusy, setWishlistBusy] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const liftAnim = useRef(new Animated.Value(0)).current

  const isNarrow = screenWidth < 768
  const overallRating = coerceRatingNumber(rating)
  const showOverallRating = ratingMode === 'overall' && hasDisplayableRating(overallRating)
  const palateMatchRating = coerceRatingNumber(searchPalateRating)
  const showPalateMatchRating =
    ratingMode === 'palate-match' && hasDisplayableRating(palateMatchRating)

  const cuisineList = normalizeCuisineList(listingCategories)
  const categoryList = normalizeCategoryList(categories)

  const parentCategories = categoryList.filter(
    (cat) => cat.parent_id === null || cat.parent_id === undefined,
  )

  const visibleCuisines = cuisineList.slice(0, 2)
  const cuisineOverflow = Math.max(0, cuisineList.length - 2)

  const iconSize = isNarrow ? 12 : 16
  const nameSize = isNarrow ? 14 : 16
  const addressSize = isNarrow ? 12 : 10
  const categorySize = 13
  const titleMaxWidth = 220

  useEffect(() => {
    if (typeof initialSavedStatus === 'boolean') {
      setSaved(initialSavedStatus)
    }
  }, [initialSavedStatus])

  useEffect(() => {
    if (!slug?.trim() || typeof initialSavedStatus === 'boolean') return
    if (!isAuthenticated) {
      setSaved(null)
      return
    }

    let cancelled = false
    setWishlistLoading(true)
    void getFavoriteStatus(slug.trim())
      .then((status) => {
        if (cancelled) return
        setSaved(status === 'saved')
      })
      .finally(() => {
        if (!cancelled) setWishlistLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, initialSavedStatus, isAuthenticated])

  const promptSignIn = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    pushLoginScreen(router, { resume: coerceResumeHref(pathname), wall: AUTH_WALL.saveCheckin })
  }, [pathname, router])

  const onBookmarkPress = useCallback(async () => {
    if (!slug?.trim()) return
    if (!isAuthenticated) {
      promptSignIn()
      return
    }
    void Haptics.selectionAsync()
    setWishlistBusy(true)
    const prev = saved
    setSaved(!saved)
    try {
      const status = await toggleFavoriteBySlug(slug.trim())
      const isSaved = status === 'saved'
      setSaved(isSaved)
      onWishlistChange?.(isSaved)
    } catch {
      setSaved(prev ?? null)
    } finally {
      setWishlistBusy(false)
    }
  }, [slug, isAuthenticated, saved, onWishlistChange, promptSignIn])

  const onCommentButtonPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (onCommentPress) {
      onCommentPress()
      return
    }
    onPress()
  }, [onCommentPress, onPress])

  const onPressIn = useCallback(() => {
    Animated.timing(liftAnim, {
      toValue: -4,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [liftAnim])

  const onPressOut = useCallback(() => {
    Animated.timing(liftAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [liftAnim])

  const a11yLabel = buildAccessibilityLabel(title, subtitle, overallRating, reviewCount, cuisineList)

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: liftAnim }],
          paddingBottom: 16,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        containerStyle,
      ]}
    >
      <View
        style={{
          position: 'relative',
          width: '100%',
          ...(variant === 'compact' ? { height: 152 } : isNarrow ? { aspectRatio: 16 / 9 } : { height: 222 }),
        }}
      >
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`View ${title}`}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{ width: '100%', height: '100%' }}
        >
          {uri && !imageFailed ? (
            <Image
              source={{ uri }}
              style={{ width: '100%', height: '100%', borderRadius: 16, backgroundColor: SURFACE_FOG }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ImageFallback style={{ width: '100%', height: '100%', borderRadius: 16 }} />
          )}
        </Pressable>

        {slug && variant !== 'compact' ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <ActionCircle onPress={() => void onBookmarkPress()} disabled={wishlistBusy}>
              {wishlistLoading ? (
                <View
                  style={{
                    width: iconSize,
                    height: iconSize,
                    borderRadius: iconSize / 2,
                    backgroundColor: '#e5e7eb',
                  }}
                />
              ) : (
                <AppIcon
                  name="bookmark"
                  active={Boolean(saved)}
                  size={iconSize}
                  color={saved ? BRAND_PRIMARY : TEXT_COLOR}
                />
              )}
            </ActionCircle>
            <ActionCircle onPress={onCommentButtonPress}>
              <AppIcon name="message-circle" size={iconSize} color={TEXT_COLOR} />
            </ActionCircle>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ backgroundColor: 'transparent' }}
      >
        <View style={{ paddingTop: variant === 'compact' ? 8 : isNarrow ? 12 : 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Text
              style={{
                flexShrink: 1,
                maxWidth: titleMaxWidth,
                
                fontSize: nameSize,
                fontFamily: FONT.headingMedium,
                color: TEXT_COLOR,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>

            {showOverallRating || showPalateMatchRating ? (
              <View style={{ flexShrink: 0, alignItems: 'flex-end' }}>
                {showOverallRating ? (
                  <RatingDisplay
                    value={overallRating}
                    size="sm"
                    reviewCount={showReviewCount ? reviewCount : undefined}
                  />
                ) : (
                  <RatingDisplay
                    value={palateMatchRating}
                    size="sm"
                    reviewCount={
                      searchPalateReviewCount != null && searchPalateReviewCount > 0
                        ? searchPalateReviewCount
                        : undefined
                    }
                    label="Match"
                  />
                )}
              </View>
            ) : null}
          </View>

          {subtitle?.trim() ? (
            <Text
              style={{
                marginTop: 4,
                
                fontSize: addressSize,
                fontFamily: bodyFont('400'),
                color: TEXT_MUTED,
                lineHeight: addressSize * 1.4,
              }}
              numberOfLines={2}
            >
              {subtitle.trim()}
            </Text>
          ) : null}

          {visibleCuisines.length > 0 ? (
            <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {visibleCuisines.map((cuisine) => (
                <CuisinePill key={cuisine.slug || String(cuisine.id)} label={cuisine.name} />
              ))}
              {cuisineOverflow > 0 ? <CuisinePill label={`+${cuisineOverflow}`} /> : null}
            </View>
          ) : null}

          {variant !== 'compact' && parentCategories.length > 0 ? (
            <View
              style={{
                marginTop: 4,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {parentCategories.map((category, index) => (
                <View
                  key={category.slug || String(category.id)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  {index > 0 ? (
                    <Text
                      style={{
                        fontFamily: FONT.body,
                        fontSize: categorySize,
                        color: BRAND_PRIMARY,
                      }}
                    >
                      {' · '}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      
                      fontSize: categorySize,
                      fontFamily: bodyFont('400'),
                      color: BRAND_PRIMARY,
                    }}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  )
}