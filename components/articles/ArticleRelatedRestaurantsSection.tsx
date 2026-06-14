import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'

import {
  RestaurantBrowseCardItem,
  restaurantBrowseCardItemFromFeatured,
} from '@/components/restaurant/RestaurantBrowseCardItem'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { useHaptic } from '@/hooks/useHaptic'
import type { FeaturedRestaurantApi } from '@/types/featuredRestaurant'

export interface ArticleRelatedRestaurantsSectionProps {
  /** Linked restaurants — same shape as home Recommended row. */
  restaurants: FeaturedRestaurantApi[]
  /**
   * When enrichment failed but `article_restaurant_associations.length > 0`,
   * show fallback CTA (`articlev2.md` §5 State B).
   */
  fallbackAssociationCount?: number
}

/**
 * Restaurants linked to this article — standard {@link RestaurantBrowseCardItem} tiles.
 */
export function ArticleRelatedRestaurantsSection({
  restaurants,
  fallbackAssociationCount = 0,
}: ArticleRelatedRestaurantsSectionProps) {
  const hapticLight = useHaptic('light')

  const showFallbackOnly = restaurants.length === 0 && fallbackAssociationCount > 0

  if (restaurants.length === 0 && !showFallbackOnly) return null

  return (
    <View
      className="mt-10 w-full px-4 pt-8 pb-2"
      style={{ borderTopWidth: 1, borderTopColor: BORDER_SUBTLE }}
    >
      {showFallbackOnly ? (
        <>
          <Text
            className="mb-2 text-center text-lg font-semibold"
            style={{ color: TEXT_HEADING }}
          >
            Restaurants in this story
          </Text>
          <Text className="mb-3 text-center text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
            This article covers {fallbackAssociationCount}{' '}
            {fallbackAssociationCount === 1 ? 'place' : 'places'} on TastyPlates.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore restaurants"
            onPress={() => {
              hapticLight()
              router.push(SCREEN_RESTAURANTS)
            }}
            className="items-center py-2 active:opacity-80"
          >
            <Text className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
              Explore restaurants →
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text
            className="mb-2 text-center text-lg font-semibold leading-snug"
            style={{ color: TEXT_HEADING }}
          >
            Restaurants in this article
          </Text>
          <Text className="mb-6 text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            Places we mention in this story — tap through for full listings, photos, and reviews.
          </Text>
          <View style={{ gap: 12 }}>
            {restaurants.map((row) => (
              <RestaurantBrowseCardItem
                key={row.id}
                {...restaurantBrowseCardItemFromFeatured(row)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  )
}
