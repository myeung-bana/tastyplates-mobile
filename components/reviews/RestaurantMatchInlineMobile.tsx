import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

import { Button } from '@/components/ui/Button'
import { BRAND_PRIMARY } from '@/constants/brand'
import { googlePlacePhotoUrl } from '@/lib/googlePlaces'
import type { MatchedRestaurant } from '@/lib/findTastyPlatesMatch'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'

export type MatchResultState = {
  placeData: PlacesDetailsResult
  existingRestaurant: MatchedRestaurant | null
}

type Props = {
  matching: boolean
  matchResult: MatchResultState | null
  onUseExisting: (restaurant: MatchedRestaurant) => void
  onCreateNew: (placeData: PlacesDetailsResult) => void
  onClear: () => void
}

export function RestaurantMatchInlineMobile({
  matching,
  matchResult,
  onUseExisting,
  onCreateNew,
  onClear,
}: Props): JSX.Element | null {
  if (!matchResult && !matching) return null

  if (matching) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color={BRAND_PRIMARY} />
        <Text className="mt-3 font-neusans text-sm text-[#6b7280]">Checking restaurant…</Text>
      </View>
    )
  }

  if (!matchResult) return null

  const { placeData, existingRestaurant } = matchResult
  const photoRef = placeData.photos?.[0]?.photo_reference
  const placePhoto = photoRef ? googlePlacePhotoUrl(photoRef, 160) : null
  const placeAddress = placeData.formatted_address ?? placeData.vicinity ?? ''
  const placeName = placeData.name ?? 'Restaurant'

  return (
    <View className="mx-4 mt-3 rounded-2xl border border-[#e5e7eb] p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear selection"
        onPress={onClear}
        className="absolute right-3 top-3 z-10 p-1"
      >
        <Feather name="x" size={16} color="#9ca3af" />
      </Pressable>

      {existingRestaurant ? (
        <>
          <Text className="mb-3 font-neusans text-sm text-gray-600">
            We found this restaurant in our database.
          </Text>
          <View className="mb-3 flex-row gap-3 rounded-xl bg-gray-50 p-3">
            {existingRestaurant.featured_image_url ? (
              <Image
                source={{ uri: existingRestaurant.featured_image_url }}
                style={{ width: 52, height: 52, borderRadius: 12 }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View className="h-[52px] w-[52px] rounded-xl bg-gray-200" />
            )}
            <View className="min-w-0 flex-1">
              <Text className="font-neusans text-sm font-medium text-[#31343F]" numberOfLines={2}>
                {existingRestaurant.title}
              </Text>
              {existingRestaurant.listing_street ? (
                <Text className="mt-0.5 font-neusans text-xs text-[#9ca3af]" numberOfLines={2}>
                  {existingRestaurant.listing_street}
                </Text>
              ) : null}
              {existingRestaurant.average_rating != null ? (
                <Text className="mt-1 font-neusans text-[10px] text-[#9ca3af]">
                  ★ {existingRestaurant.average_rating.toFixed(1)}
                  {existingRestaurant.ratings_count != null
                    ? ` (${existingRestaurant.ratings_count})`
                    : ''}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            variant="primary"
            className="mb-2 w-full"
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              onUseExisting(existingRestaurant)
            }}
          >
            Use this listing
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onPress={() => {
              void Haptics.selectionAsync()
              onCreateNew(placeData)
            }}
          >
            Create new instead
          </Button>
        </>
      ) : (
        <>
          <Text className="mb-3 font-neusans text-sm text-gray-600">
            This restaurant isn&apos;t on TastyPlates yet.
          </Text>
          <View className="mb-3 flex-row gap-3 rounded-xl bg-gray-50 p-3">
            {placePhoto ? (
              <Image
                source={{ uri: placePhoto }}
                style={{ width: 52, height: 52, borderRadius: 12 }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View className="h-[52px] w-[52px] rounded-xl bg-gray-200" />
            )}
            <View className="min-w-0 flex-1">
              <Text className="font-neusans text-sm font-medium text-[#31343F]" numberOfLines={2}>
                {placeName}
              </Text>
              {placeAddress ? (
                <Text className="mt-0.5 font-neusans text-xs text-[#9ca3af]" numberOfLines={2}>
                  {placeAddress}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            variant="primary"
            className="w-full"
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              onCreateNew(placeData)
            }}
          >
            Create listing & write review
          </Button>
        </>
      )}
    </View>
  )
}

export function ReviewSearchHelpFooter(): JSX.Element {
  return (
    <View className="items-center px-4 py-8">
      <Text className="text-center font-neusans text-xs text-[#9ca3af]">
        Can&apos;t find the restaurant?{' '}
        <Text
          className="font-neusans text-xs text-[#ff7c0a]"
          onPress={() => {
            void Linking.openURL('mailto:support@tastyplates.co')
          }}
        >
          Contact the TastyPlates team
        </Text>
      </Text>
    </View>
  )
}
