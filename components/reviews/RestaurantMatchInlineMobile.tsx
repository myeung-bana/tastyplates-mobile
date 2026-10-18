import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { Button } from '@/components/ui/Button'
import { BRAND_PRIMARY } from '@/constants/brand'
import { DEFAULT_RESTAURANT_IMAGE } from '@/constants/images'
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'
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
        <Text className="mt-3 text-sm text-[#6b7280] font-body">Checking restaurant…</Text>
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
        <AppIcon name="x" size={16} color="#9ca3af" />
      </Pressable>

      {existingRestaurant ? (
        <>
          <Text className="mb-3 text-sm text-gray-600 font-body">
            We found this restaurant in our database.
          </Text>
          <View className="mb-3 flex-row gap-3 rounded-xl bg-gray-50 p-3">
            <Image
              source={{
                uri:
                  resolveEffectiveFeaturedImageUrl(existingRestaurant.featured_image_url) ??
                  DEFAULT_RESTAURANT_IMAGE,
              }}
              style={{ width: 52, height: 52, borderRadius: 12 }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <View className="min-w-0 flex-1">
              <Text className="text-sm text-[#31343F] font-body-medium" numberOfLines={2}>
                {existingRestaurant.title}
              </Text>
              {existingRestaurant.listing_street ? (
                <Text className="mt-0.5 text-xs text-[#9ca3af] font-body" numberOfLines={2}>
                  {existingRestaurant.listing_street}
                </Text>
              ) : null}
              {existingRestaurant.average_rating != null ? (
                <Text className="mt-1 text-[10px] text-[#9ca3af] font-body">
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
          <Text className="mb-3 text-sm text-gray-600 font-body">
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
              <Text className="text-sm text-[#31343F] font-body-medium" numberOfLines={2}>
                {placeName}
              </Text>
              {placeAddress ? (
                <Text className="mt-0.5 text-xs text-[#9ca3af] font-body" numberOfLines={2}>
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
      <Text className="text-center text-xs text-[#9ca3af] font-body">
        Can&apos;t find the restaurant?{' '}
        <Text
          className="text-xs text-[#FF7C09] font-body"
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
