import { useCallback } from 'react'
import { router } from 'expo-router'
import type { StyleProp, ViewStyle } from 'react-native'

import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import { SCREEN_RESTAURANT_DETAIL } from '@/constants/screens'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import type { FeaturedRestaurantApi } from '@/types/featuredRestaurant'
import {
  formatRestaurantCardAddress,
  normalizeCategoryList,
  normalizeCuisineList,
  type RestaurantAddressFields,
  type RestaurantListCategory,
  type RestaurantListCuisine,
  type RestaurantListRow,
} from '@/services/restaurantsV2Service'

/** Horizontal padding on Restaurants tab — browse cards are full width inside this inset. */
export const RESTAURANT_BROWSE_CARD_HORIZONTAL_PAD = 16

export function getRestaurantBrowseCardWidth(screenWidth: number): number {
  return screenWidth - RESTAURANT_BROWSE_CARD_HORIZONTAL_PAD * 2
}

/** Home Recommended carousel — 15% narrower than content width so the next card peeks on the right. */
export const HOME_CAROUSEL_CARD_WIDTH_SCALE = 0.85

export function getHomeCarouselRestaurantCardWidth(screenWidth: number): number {
  const contentWidth = screenWidth - RESTAURANT_BROWSE_CARD_HORIZONTAL_PAD
  return Math.round(contentWidth * HOME_CAROUSEL_CARD_WIDTH_SCALE)
}

export interface RestaurantBrowseCardItemProps {
  title: string
  slug?: string | null
  imageUrl?: string | null
  listingStreet?: string | null
  address?: RestaurantAddressFields | null
  rating?: number | null
  reviewCount?: number | null
  listingCategories?: RestaurantListCuisine[]
  categories?: RestaurantListCategory[]
  containerStyle?: StyleProp<ViewStyle>
  /** Overrides default navigation to restaurant detail. */
  onPress?: () => void
  /** When false, hides review count beside rating (home Recommended carousel). */
  showReviewCount?: boolean
}

/**
 * Single source for browse tiles — Restaurants tab, home Recommended row, article lists.
 */
export function RestaurantBrowseCardItem({
  title,
  slug: slugProp,
  imageUrl,
  listingStreet,
  address,
  rating,
  reviewCount,
  listingCategories,
  categories,
  containerStyle,
  onPress: onPressOverride,
  showReviewCount = true,
}: RestaurantBrowseCardItemProps) {
  const slug = slugProp?.trim() ?? ''
  const overallRating = coerceRatingNumber(rating)

  const navigate = useCallback(() => {
    if (!slug) return
    router.push({
      pathname: SCREEN_RESTAURANT_DETAIL,
      params: { slug },
    })
  }, [slug])

  const onPress = onPressOverride ?? navigate
  const onCommentPress = onPressOverride ?? navigate

  return (
    <RestaurantBrowseCard
      title={title}
      slug={slug || undefined}
      imageUrl={imageUrl}
      subtitle={formatRestaurantCardAddress(listingStreet, address)}
      listingCategories={listingCategories}
      categories={categories}
      rating={overallRating}
      reviewCount={reviewCount ?? undefined}
      showReviewCount={showReviewCount}
      containerStyle={containerStyle}
      onPress={onPress}
      onCommentPress={onCommentPress}
    />
  )
}

export function restaurantBrowseCardItemFromListRow(
  item: RestaurantListRow,
): RestaurantBrowseCardItemProps {
  return {
    title: item.title,
    slug: item.slug,
    imageUrl: item.featured_image_url,
    listingStreet: item.listing_street,
    address: item.address ?? null,
    listingCategories: normalizeCuisineList(item.cuisines),
    categories: normalizeCategoryList(item.categories),
    rating: item.average_rating,
    reviewCount: item.ratings_count,
  }
}

export function restaurantBrowseCardItemFromFeatured(
  row: FeaturedRestaurantApi,
): RestaurantBrowseCardItemProps {
  const r = row.restaurant
  return {
    title: r.title,
    slug: r.slug,
    imageUrl: r.featured_image_url,
    listingStreet: r.listing_street,
    address: r.address,
    listingCategories: normalizeCuisineList(r.cuisines),
    categories: normalizeCategoryList(r.categories),
    rating: r.average_rating,
    reviewCount: r.ratings_count,
  }
}
