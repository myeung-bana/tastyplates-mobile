import { Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'
import { RatingDisplay } from '@/components/ui/RatingDisplay'

import { DEFAULT_RESTAURANT_IMAGE } from '@/constants/images'
import {
  formatRestaurantSearchResultAddress,
  listRowRatingForSearchResult,
} from '@/lib/restaurantDiscoveryHelpers'
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

const DEFAULT_IMAGE = DEFAULT_RESTAURANT_IMAGE

interface RestaurantListRowProps {
  result: RestaurantSearchResult
  isSelected?: boolean
  onPress: () => void
}

export function RestaurantListRow({
  result,
  isSelected = false,
  onPress,
}: RestaurantListRowProps): JSX.Element {
  const title = result.title
  const imageUrl = resolveEffectiveFeaturedImageUrl(result.featured_image_url) ?? DEFAULT_IMAGE
  const address = formatRestaurantSearchResultAddress(result)
  const rating = listRowRatingForSearchResult(result)

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3 active:bg-gray-50"
      style={{ backgroundColor: isSelected ? '#fef7f0' : undefined }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 40, height: 40, borderRadius: 10 }}
        resizeMode="cover"
      />

      <View className="min-w-0 flex-1">
        <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
          {title}
        </Text>
        {address ? (
          <Text className="mt-0.5 font-neusans text-[13px] text-gray-500" numberOfLines={1}>
            {address}
          </Text>
        ) : null}
      </View>

      {rating != null ? (
        <RatingDisplay value={rating} size="sm" />
      ) : null}

      <AppIcon name="chevron-right" size={16} color="#e5e7eb" />
    </Pressable>
  )
}
