import { Image, Text, View } from 'react-native'

import { DEFAULT_RESTAURANT_IMAGE } from '@/constants/images'
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'

export type ReviewRestaurantSummary = {
  name: string
  address: string
  imageUrl?: string | null
}

type Props = {
  restaurant: ReviewRestaurantSummary
}

/** Restaurant row at top of create / edit review — matches Write Review layout. */
export function ReviewRestaurantHeader({ restaurant }: Props): JSX.Element {
  const imageUri =
    resolveEffectiveFeaturedImageUrl(restaurant.imageUrl) ?? DEFAULT_RESTAURANT_IMAGE

  return (
    <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-4">
      <View className="flex-row items-center gap-3">
        <Image
          source={{ uri: imageUri }}
          style={{ width: 52, height: 52, borderRadius: 12 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View className="min-w-0 flex-1">
          <Text className="font-neusans text-base font-medium text-[#31343F]" numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.address ? (
            <Text className="mt-0.5 font-neusans text-xs text-gray-500" numberOfLines={1}>
              {restaurant.address}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}
