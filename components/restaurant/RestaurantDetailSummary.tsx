import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { RestaurantImageCarousel } from '@/components/restaurant/RestaurantImageCarousel'
import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { cuisineBrowsePath } from '@/constants/screens'
import {
  buildRestaurantImageGallery,
  extractCategoryNodes,
  formatPriceRange,
  isRestaurantOpenToday,
  parseOpeningHours,
  resolveRestaurantHeaderLocation,
  restaurantPalateAndCategoryLabels,
} from '@/lib/restaurantDetailUtils'
import type { RestaurantDetailRow } from '@/services/restaurantDetailService'

export type RestaurantDetailSummaryProps = {
  restaurant: RestaurantDetailRow
}

/**
 * Sections 1–2: full-bleed image gallery + restaurant header card.
 */
export function RestaurantDetailSummary({ restaurant }: RestaurantDetailSummaryProps): JSX.Element {
  const router = useRouter()
  const images = buildRestaurantImageGallery(restaurant)
  const { primaryPalate } = restaurantPalateAndCategoryLabels(restaurant)
  const categories = extractCategoryNodes(restaurant.categories)
  const locationLine = resolveRestaurantHeaderLocation(restaurant)
  const price = formatPriceRange(restaurant.price_range_id)

  const parsedHours = parseOpeningHours(restaurant.opening_hours as string | object | null | undefined)
  const openStatus = isRestaurantOpenToday(restaurant.opening_hours as string | object | null | undefined)
  const showOpenBadge = parsedHours != null

  return (
    <>
      <RestaurantImageCarousel images={images} title={restaurant.title} />

      <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white p-4">
        {primaryPalate ? (
          <View
            className="mb-2 self-start rounded-[20px] px-[10px] py-1"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Text className="font-neusans text-[13px] font-normal text-white">{primaryPalate}</Text>
          </View>
        ) : null}

        <View className="mb-2 flex-row flex-wrap items-center gap-2.5">
          <Text
            className="min-w-0 flex-1 font-neusans text-2xl font-bold leading-tight text-gray-900"
            style={{ color: TEXT_HEADING }}
            numberOfLines={3}
          >
            {restaurant.title}
          </Text>
          {showOpenBadge ? (
            <View
              className={`rounded-full px-2.5 py-0.5 ${
                openStatus ? 'bg-green-50' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  openStatus ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {openStatus ? 'Open' : 'Closed'}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mb-2 flex-row items-center gap-1.5">
          <AppIcon name="map-pin" size={16} color="#4b5563" />
          <Text className="flex-1 font-neusans text-sm font-medium text-gray-600">{locationLine}</Text>
        </View>

        {categories.length > 0 ? (
          <View className="mb-2 flex-row flex-wrap gap-1">
            {categories.map((category) => (
              <Pressable
                key={category.slug}
                accessibilityRole="button"
                onPress={() => router.push(cuisineBrowsePath(category.slug) as never)}
                className="active:opacity-90"
              >
                <View
                  className="rounded-[20px] px-[10px] py-1"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  <Text className="font-neusans text-[13px] font-normal text-white">{category.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {price ? (
          <Text className="font-neusans text-sm font-medium text-gray-600">{price}</Text>
        ) : null}
      </View>
    </>
  )
}
