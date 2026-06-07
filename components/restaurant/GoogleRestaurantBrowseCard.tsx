import { Image, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY } from '@/constants/brand'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import type { GoogleRestaurantResult } from '@/types/restaurantSearchResult'

interface GoogleRestaurantBrowseCardProps {
  place: GoogleRestaurantResult
  containerStyle?: StyleProp<ViewStyle>
  onPress: () => void
}

export function GoogleRestaurantBrowseCard({
  place,
  containerStyle,
  onPress,
}: GoogleRestaurantBrowseCardProps): JSX.Element {
  const rating = coerceRatingNumber(place.google_rating)

  return (
    <Pressable onPress={onPress} style={containerStyle} className="overflow-hidden">
      <View className="relative overflow-hidden rounded-2xl bg-gray-100" style={{ aspectRatio: 4 / 3 }}>
        {place.featured_image_url ? (
          <Image
            source={{ uri: place.featured_image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <AppIcon name="restaurant" size={40} color="#d1d5db" />
          </View>
        )}

        <View className="absolute left-2 top-2 rounded-full bg-gray-900/70 px-2 py-0.5">
          <Text className="font-neusans text-[10px] font-medium text-white">Google</Text>
        </View>
      </View>

      <View className="px-0.5 pt-2">
        <View className="flex-row items-center justify-between">
          <Text
            className="mr-2 flex-1 font-neusans text-[15px] font-medium text-[#31343F]"
            numberOfLines={1}
          >
            {place.title}
          </Text>
          {rating != null ? (
            <View className="flex-row items-center gap-0.5">
              <AppIcon name="star" size={12} color="#f59e0b" />
              <Text className="font-neusans text-[13px] text-[#31343F]">{rating.toFixed(1)}</Text>
              <Text className="font-neusans text-[11px] text-[#6b7280]"> G</Text>
            </View>
          ) : null}
        </View>

        {place.address ? (
          <Text className="mt-0.5 font-neusans text-xs text-[#6b7280]" numberOfLines={1}>
            {place.address}
          </Text>
        ) : null}

        <Text className="mt-1 font-neusans text-[11px]" style={{ color: BRAND_PRIMARY }}>
          Be the first to review on TastyPlates →
        </Text>
      </View>
    </Pressable>
  )
}
