import { useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { WriteReviewForm } from '@/components/studio/add-review/WriteReviewForm'
import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { SCREEN_STUDIO_ADD_REVIEW } from '@/constants/screens'
import { useRequireAuthOnMount } from '@/hooks/useRequireAuthOnMount'
import { firstSegmentParam } from '@/lib/routeParams'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import { googlePlacePhotoUrl } from '@/lib/googlePlaces'
import { createRestaurantFromPlace } from '@/services/createRestaurantFromPlace'

export default function StudioCreateReviewScreen(): JSX.Element {
  useRequireAuthOnMount()

  const params = useLocalSearchParams<{ placeData?: string | string[] }>()
  const rawPlace = firstSegmentParam(params.placeData)

  const placeData = useMemo((): PlacesDetailsResult | null => {
    if (!rawPlace.length) return null
    try {
      return JSON.parse(rawPlace) as PlacesDetailsResult
    } catch {
      return null
    }
  }, [rawPlace])

  const [createdUuid, setCreatedUuid] = useState<string | null>(null)

  const resolveRestaurantUuid = useCallback(async (): Promise<string> => {
    if (createdUuid) return createdUuid
    if (!placeData) throw new Error('Missing place data')
    const created = await createRestaurantFromPlace(placeData)
    setCreatedUuid(created.uuid)
    return created.uuid
  }, [createdUuid, placeData])

  if (!placeData) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center font-neusans text-base" style={{ color: TEXT_HEADING }}>
          Missing Google place data.
        </Text>
        <Text
          className="mt-4 font-neusans text-sm"
          style={{ color: BRAND_PRIMARY }}
          onPress={() => router.replace(SCREEN_STUDIO_ADD_REVIEW)}
        >
          Back to search
        </Text>
      </View>
    )
  }

  const photoRef = placeData.photos?.[0]?.photo_reference
  const imageUrl = photoRef ? googlePlacePhotoUrl(photoRef, 200) : null
  const address = placeData.formatted_address ?? placeData.vicinity ?? ''

  return (
    <View className="flex-1 bg-white">
      <WriteReviewForm
        restaurant={{
          uuid: createdUuid ?? '',
          name: placeData.name ?? 'Restaurant',
          address,
          imageUrl,
        }}
        resolveRestaurantUuid={resolveRestaurantUuid}
      />
    </View>
  )
}
