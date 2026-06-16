import { Image, Text, View } from 'react-native'

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
  return (
    <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-4">
      <View className="flex-row items-center gap-3">
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={{ width: 52, height: 52, borderRadius: 12 }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="h-[52px] w-[52px] rounded-xl bg-gray-100" />
        )}
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
