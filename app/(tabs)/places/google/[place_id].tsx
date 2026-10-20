import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'

import { RestaurantDetailSkeleton } from '@/components/restaurant/RestaurantDetailSkeleton'
import { RestaurantDetailView } from '@/components/restaurant/RestaurantDetailView'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_RESTAURANT_DETAIL, SCREEN_RESTAURANTS } from '@/constants/screens'
import { adaptGooglePlaceToDetailRow } from '@/lib/adaptGooglePlaceDetail'
import { adaptGoogleReviewsToPreviews } from '@/lib/adaptGooglePlaceReviews'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import type { MatchedRestaurant } from '@/lib/findTastyPlatesMatch'
import { fetchGooglePlaceDetails, googlePhotoAttributionText } from '@/lib/googlePlaces'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import { firstSegmentParam } from '@/lib/routeParams'

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; place: PlacesDetailsResult; tpMatch: MatchedRestaurant | null }

export default function GooglePlaceDetailScreen(): JSX.Element {
  const navigation = useNavigation()
  const raw = useLocalSearchParams<{ place_id?: string | string[] }>()
  const placeId = firstSegmentParam(raw.place_id)
  const [state, setState] = useState<ScreenState>({ status: 'loading' })

  const load = useCallback(async () => {
    if (!placeId) {
      setState({ status: 'error', message: 'Missing Google place id' })
      return
    }
    setState({ status: 'loading' })
    try {
      const place = await fetchGooglePlaceDetails(placeId, undefined, { includeReviews: true })
      if (!place) {
        setState({ status: 'error', message: 'Restaurant not found' })
        return
      }

      const tpMatch = await matchRestaurantForPlace({
        placeId,
        name: place.name ?? '',
        address: place.formatted_address ?? place.vicinity ?? '',
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
      })

      if (tpMatch?.slug) {
        router.replace({
          pathname: SCREEN_RESTAURANT_DETAIL,
          params: { slug: tpMatch.slug },
        })
        return
      }

      setState({ status: 'ready', place, tpMatch: tpMatch ?? null })
    } catch (e) {
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Failed to load',
      })
    }
  }, [placeId])

  useEffect(() => {
    void load()
  }, [load])

  // Loaded page draws its own back + share over the photo (design S6).
  useLayoutEffect(() => {
    const ready = state.status === 'ready'
    navigation.setOptions({
      title: ready ? state.place.name?.trim() || 'Restaurant' : 'Restaurant',
      headerShown: !ready,
    })
  }, [navigation, state])

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack()
    else router.replace(SCREEN_RESTAURANTS)
  }, [navigation])

  if (state.status === 'loading') {
    return (
      <View className="flex-1 bg-white">
        <RestaurantDetailSkeleton />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
          {state.message}
        </Text>
        <Pressable
          onPress={() => void load()}
          className="mt-4 rounded-full px-5 py-2.5"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Text className="text-white font-body-semibold">Retry</Text>
        </Pressable>
      </View>
    )
  }

  const { place } = state
  const placeName = place.name?.trim() || 'Restaurant'
  const restaurant = adaptGooglePlaceToDetailRow(place, placeId!)
  const googleReviews = adaptGoogleReviewsToPreviews(place.reviews, placeId!)
  const reviewTotal = place.user_ratings_total ?? googleReviews.length

  return (
    <View className="flex-1 bg-white">
      <RestaurantDetailView
        slug=""
        restaurant={restaurant}
        summary={null}
        reviews={googleReviews}
        reviewTotal={reviewTotal}
        googlePlaceListing={{
          placeId: placeId!,
          placeName,
          photoAttribution: googlePhotoAttributionText(place.photos?.[0]),
        }}
        onBack={goBack}
      />
    </View>
  )
}
