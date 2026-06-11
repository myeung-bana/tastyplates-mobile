import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY } from '@/constants/brand'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import { formatRestaurantSearchResultAddress } from '@/lib/restaurantDiscoveryHelpers'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

function AddButton({
  onPress,
  disabled,
  busy,
}: {
  onPress: () => void
  disabled?: boolean
  busy?: boolean
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add to list"
      onPress={onPress}
      disabled={disabled || busy}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-orange-50 active:opacity-80"
      style={{ opacity: disabled && !busy ? 0.45 : 1 }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={BRAND_PRIMARY} />
      ) : (
        <AppIcon name="plus" size={22} color={BRAND_PRIMARY} />
      )}
    </Pressable>
  )
}

export function ListPickerDiscoveryRow({
  result,
  onAdd,
  adding,
  disabled,
}: {
  result: RestaurantSearchResult
  onAdd: () => void
  adding?: boolean
  disabled?: boolean
}): JSX.Element {
  const title = result.title
  const imageUrl = result.featured_image_url ?? DEFAULT_IMAGE
  const address = formatRestaurantSearchResultAddress(result)
  const rating = isTPResult(result)
    ? coerceRatingNumber(result.average_rating)
    : coerceRatingNumber(result.google_rating)

  return (
    <View className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3">
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 40, height: 40, borderRadius: 10 }}
        resizeMode="cover"
      />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {address ? (
          <Text className="mt-0.5 font-neusans text-[13px] text-gray-500" numberOfLines={1}>
            {address}
          </Text>
        ) : null}
        {rating != null ? (
          <Text className="mt-0.5 font-neusans text-[11px] text-gray-400">★ {rating.toFixed(1)}</Text>
        ) : null}
      </View>
      <AddButton onPress={onAdd} disabled={disabled} busy={adding} />
    </View>
  )
}
