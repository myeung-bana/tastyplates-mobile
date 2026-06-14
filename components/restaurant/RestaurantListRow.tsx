import { Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { formatRestaurantSearchResultAddress } from '@/lib/restaurantDiscoveryHelpers'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

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
  const imageUrl = result.featured_image_url ?? DEFAULT_IMAGE
  const address = formatRestaurantSearchResultAddress(result)

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

      <AppIcon name="chevron-right" size={16} color="#e5e7eb" />
    </Pressable>
  )
}
