import { Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { googlePlacePhotoUrl, type NearbyPlaceRow, type PlacesAutocompletePrediction } from '@/lib/googlePlaces'
import { formatShortFormattedAddress } from '@/services/restaurantsV2Service'
import { coerceRatingNumber, hasDisplayableRating } from '@/lib/ratingDisplayUtils'
import { RatingDisplay } from '@/components/ui/RatingDisplay'

function formatNearbyRowAddress(address: string | null | undefined): string | null {
  return formatShortFormattedAddress(address) ?? address?.trim() ?? null
}

function formatNearbyRowRating(row: NearbyPlaceRow): number | null {
  const rating = coerceRatingNumber(row.google_rating)
  return hasDisplayableRating(rating) ? rating : null
}

type NearbyProps = {
  row: NearbyPlaceRow
  onPress: () => void
}

export function NearbyRestaurantRow({ row, onPress }: NearbyProps): JSX.Element {
  const address = formatNearbyRowAddress(row.address)
  const rating = formatNearbyRowRating(row)

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3 active:bg-gray-50"
    >
      {row.photo_reference ? (
        <Image
          source={{ uri: googlePlacePhotoUrl(row.photo_reference, 80) }}
          style={{ width: 40, height: 40, borderRadius: 10 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-gray-100">
          <AppIcon name="map-pin" size={18} color="#9ca3af" />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] text-[#31343F] font-body-medium" numberOfLines={1}>
          {row.name}
        </Text>
        {address ? (
          <Text className="mt-0.5 text-[13px] text-gray-500 font-body" numberOfLines={1}>
            {address}
          </Text>
        ) : null}
      </View>
      {rating != null ? <RatingDisplay value={rating} size="sm" /> : null}
      <AppIcon name="chevron-right" size={16} color="#e5e7eb" />
    </Pressable>
  )
}

type PredictionProps = {
  prediction: PlacesAutocompletePrediction
  onPress: () => void
}

export function SearchPredictionRow({ prediction, onPress }: PredictionProps): JSX.Element {
  const main = prediction.structured_formatting?.main_text ?? prediction.description
  const secondary = prediction.structured_formatting?.secondary_text ?? ''

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3 active:bg-gray-50"
    >
      <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-gray-100">
        <AppIcon name="map-pin" size={18} color="#9ca3af" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] text-[#31343F] font-body-medium" numberOfLines={1}>
          {main}
        </Text>
        {secondary ? (
          <Text className="mt-0.5 text-[13px] text-gray-500 font-body" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
      <AppIcon name="chevron-right" size={16} color="#e5e7eb" />
    </Pressable>
  )
}

export function NearbySkeletonList(): JSX.Element {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} className="flex-row items-center gap-3 px-4 py-3">
          <View className="h-10 w-10 rounded-[10px] bg-gray-200" />
          <View className="flex-1 gap-1.5">
            <View className="h-4 rounded bg-gray-200" style={{ width: '66%' }} />
            <View className="h-3 rounded bg-gray-200" style={{ width: '50%' }} />
          </View>
        </View>
      ))}
    </>
  )
}

export function NearbyEmptyState(): JSX.Element {
  return (
    <View className="items-center px-6 py-10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-orange-50">
        <AppIcon name="map-pin" size={20} color="#FF7C09" />
      </View>
      <Text className="text-sm text-gray-700 font-body-medium">No nearby restaurants found</Text>
      <Text className="mt-1 text-center text-xs text-gray-500 font-body">
        Try searching by name above
      </Text>
    </View>
  )
}

export function SearchEmptyState(): JSX.Element {
  return (
    <View className="items-center px-6 py-10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <AppIcon name="search" size={20} color="#9ca3af" />
      </View>
      <Text className="text-sm text-gray-700 font-body-medium">No results found</Text>
      <Text className="mt-1 text-center text-xs text-gray-500 font-body">
        Try a different name or check the spelling
      </Text>
    </View>
  )
}

export function SectionHeader({ title }: { title: string }): JSX.Element {
  return (
    <Text className="px-4 pb-2 pt-2 text-xs uppercase tracking-wider text-[#9ca3af] font-body-semibold">
      {title}
    </Text>
  )
}
