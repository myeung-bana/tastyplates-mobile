import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { RestaurantImageCarousel } from '@/components/restaurant/RestaurantImageCarousel'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'
import { isNoPalateFilter } from '@/lib/palateSearch'
import {
  buildRestaurantImageGallery,
  formatPriceRange,
  formatRestaurantAddress,
  restaurantPalateAndCategoryLabels,
} from '@/lib/restaurantDetailUtils'
import type { RestaurantDetailRow } from '@/services/restaurantDetailService'
import { formatRestaurantCardAddress } from '@/services/restaurantsV2Service'

export type RestaurantDetailSummaryProps = {
  restaurant: RestaurantDetailRow
  overallAvg: number | null
  overallCount: number
  palateSlug?: string | null
  onShare: () => void
}

/**
 * Card-visible header block — aligns with `RestaurantBrowseCard` + web detail header.
 */
export function RestaurantDetailSummary({
  restaurant,
  overallAvg,
  overallCount,
  palateSlug,
  onShare,
}: RestaurantDetailSummaryProps): JSX.Element {
  const images = buildRestaurantImageGallery(restaurant)
  const { primaryPalate, categories } = restaurantPalateAndCategoryLabels(restaurant)
  const subtitle = formatRestaurantCardAddress(restaurant.listing_street, restaurant.address)
  const address = formatRestaurantAddress(restaurant)
  const price = formatPriceRange(restaurant.price_range_id)
  const palateActive = !isNoPalateFilter(palateSlug)

  return (
    <>
      <RestaurantImageCarousel images={images} title={restaurant.title} />

      <View className="px-4 pb-2 pt-4">
        {palateActive ? (
          <View className="mb-3 rounded-xl border border-orange-100 bg-orange-50/90 px-3 py-2">
            <Text className="text-center text-xs text-gray-700">
              Showing scores for{' '}
              <Text className="font-semibold">{labelForPalateKey(palateSlug ?? null)}</Text>
            </Text>
          </View>
        ) : null}

        <View className="mb-2 flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="text-xl font-normal leading-snug"
              style={{ color: TEXT_HEADING }}
              numberOfLines={3}
            >
              {restaurant.title}
            </Text>
            {subtitle ? (
              <Text className="mt-1 text-sm leading-normal" style={{ color: TEXT_BODY }} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share restaurant"
            hitSlop={10}
            onPress={onShare}
            className="mt-0.5 p-1 active:opacity-70"
          >
            <Ionicons name="share-outline" size={22} color={TEXT_MUTED} />
          </Pressable>
        </View>

        <View className="mb-3 flex-row flex-wrap gap-2">
          {primaryPalate ? (
            <View className="rounded-full border-2 border-[#ff7c0a] bg-[#fef7f0] px-3 py-1.5">
              <Text className="text-xs font-normal" style={{ color: BRAND_PRIMARY }}>
                {primaryPalate}
              </Text>
            </View>
          ) : null}
          {categories.slice(0, 4).map((c) => (
            <View key={c} className="rounded-full bg-[#f3f4f6] px-3 py-1.5">
              <Text className="text-xs" style={{ color: TEXT_BODY }}>
                {c}
              </Text>
            </View>
          ))}
          {price ? (
            <View className="rounded-full bg-[#f3f4f6] px-3 py-1.5">
              <Text className="text-xs" style={{ color: TEXT_BODY }}>
                {price}
              </Text>
            </View>
          ) : null}
        </View>

        <RatingDisplay size="sm" value={overallAvg} reviewCount={overallCount} />

        {address ? (
          <Text className="text-sm leading-normal" style={{ color: TEXT_BODY }} numberOfLines={3}>
            {address}
          </Text>
        ) : null}
      </View>
    </>
  )
}
