import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY } from '@/constants/brand'
import {
  googlePlacePhotoUrl,
  type NearbyPlaceRow,
  type PlacesAutocompletePrediction,
} from '@/lib/googlePlaces'

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

export function ListPickerNearbyRow({
  row,
  onAdd,
  adding,
  disabled,
}: {
  row: NearbyPlaceRow
  onAdd: () => void
  adding?: boolean
  disabled?: boolean
}): JSX.Element {
  return (
    <View className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3">
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
        <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
          {row.name}
        </Text>
        {row.address ? (
          <Text className="mt-0.5 font-neusans text-[13px] text-gray-500" numberOfLines={1}>
            {row.address}
          </Text>
        ) : null}
      </View>
      <AddButton onPress={onAdd} disabled={disabled} busy={adding} />
    </View>
  )
}

export function ListPickerSearchRow({
  prediction,
  onAdd,
  adding,
  disabled,
}: {
  prediction: PlacesAutocompletePrediction
  onAdd: () => void
  adding?: boolean
  disabled?: boolean
}): JSX.Element {
  const main = prediction.structured_formatting?.main_text ?? prediction.description
  const secondary = prediction.structured_formatting?.secondary_text ?? ''

  return (
    <View className="flex-row items-center gap-3 border-b border-gray-50 px-4 py-3">
      <View className="h-10 w-10 items-center justify-center rounded-[10px] bg-gray-100">
        <AppIcon name="map-pin" size={18} color="#9ca3af" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
          {main}
        </Text>
        {secondary ? (
          <Text className="mt-0.5 font-neusans text-[13px] text-gray-500" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
      <AddButton onPress={onAdd} disabled={disabled} busy={adding} />
    </View>
  )
}
