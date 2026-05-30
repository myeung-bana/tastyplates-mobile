import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { usePathname, useRouter } from 'expo-router'

import { BRAND_PRIMARY } from '@/constants/brand'
import { useAuth } from '@/hooks/useAuth'
import { coerceResumeHref, pushLoginScreen } from '@/lib/authRoutes'
import { coerceRatingNumber, formatRatingValue, hasDisplayableRating } from '@/lib/ratingDisplayUtils'
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

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

const TEXT_COLOR = '#31343F'
const CUISINE_PILL_BG = '#ff7c0a'
const NEUSANS = 'Neusans'

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
  /** Establishment categories; parent rows render as `A / B`. */
  categories?: RestaurantListCategory[]
  initialSavedStatus?: boolean | null
  onWishlistChange?: (isSaved: boolean) => void
  onPress: () => void
  /** Opens reviews / detail; defaults to `onPress` when omitted. */
  onCommentPress?: () => void
  containerStyle?: StyleProp<ViewStyle>
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

function CuisinePill({ label }: { label: string }): JSX.Element {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: CUISINE_PILL_BG,
      }}
    >
      <Text
        style={{
          fontFamily: NEUSANS,
          fontSize: 13,
          fontWeight: '400',
          color: '#fff',
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
}: RestaurantBrowseCardProps) {
  const uri = (imageUrl && imageUrl.trim()) || DEFAULT_IMAGE
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
  const ratingLabel = formatRatingValue(overallRating)
  const showRating = hasDisplayableRating(overallRating)
  const showCount = reviewCount != null && reviewCount > 0

  const cuisineList = normalizeCuisineList(listingCategories)
  const categoryList = normalizeCategoryList(categories)

  const parentCategories = categoryList.filter(
    (cat) => cat.parent_id === null || cat.parent_id === undefined,
  )
  const categoryLine =
    parentCategories.length > 0 ? parentCategories.map((cat) => cat.name).join(' / ') : null

  const visibleCuisines = cuisineList.slice(0, 2)
  const cuisineOverflow = Math.max(0, cuisineList.length - 2)

  const iconSize = isNarrow ? 12 : 16
  const nameSize = isNarrow ? 14 : 16
  const ratingSize = 14
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
    pushLoginScreen(router, { resume: coerceResumeHref(pathname) })
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
          ...(isNarrow ? { aspectRatio: 16 / 9 } : { height: 222 }),
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
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%', borderRadius: 16 }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </Pressable>

        {visibleCuisines.length > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
              maxWidth: '85%',
            }}
          >
            {visibleCuisines.map((cuisine) => (
              <CuisinePill key={cuisine.slug || String(cuisine.id)} label={cuisine.name} />
            ))}
            {cuisineOverflow > 0 ? (
              <CuisinePill label={`+${cuisineOverflow}`} />
            ) : null}
          </View>
        ) : null}

        {slug ? (
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
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={iconSize}
                  color={saved ? BRAND_PRIMARY : TEXT_COLOR}
                />
              )}
            </ActionCircle>
            <ActionCircle onPress={onCommentButtonPress}>
              <Ionicons name="chatbubble-outline" size={iconSize} color={TEXT_COLOR} />
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
        <View style={{ paddingTop: isNarrow ? 12 : 16 }}>
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
                fontFamily: NEUSANS,
                fontSize: nameSize,
                fontWeight: '500',
                color: TEXT_COLOR,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>

            {showRating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Ionicons name="star" size={16} color={TEXT_COLOR} />
                <Text
                  style={{
                    fontFamily: NEUSANS,
                    fontSize: ratingSize,
                    fontWeight: '400',
                    color: TEXT_COLOR,
                  }}
                >
                  {ratingLabel}
                </Text>
                {showCount ? (
                  <Text
                    style={{
                      fontFamily: NEUSANS,
                      fontSize: ratingSize,
                      fontWeight: '400',
                      color: TEXT_COLOR,
                    }}
                  >
                    ({reviewCount})
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {subtitle?.trim() ? (
            <Text
              style={{
                marginTop: 4,
                fontFamily: NEUSANS,
                fontSize: addressSize,
                fontWeight: '400',
                color: TEXT_COLOR,
                lineHeight: addressSize * 1.4,
              }}
              numberOfLines={2}
            >
              {subtitle.trim()}
            </Text>
          ) : null}

          {categoryLine ? (
            <Text
              style={{
                marginTop: 4,
                fontFamily: NEUSANS,
                fontSize: categorySize,
                fontWeight: '400',
                color: TEXT_COLOR,
                letterSpacing: 0.025 * categorySize,
              }}
              numberOfLines={1}
            >
              {categoryLine}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  )
}