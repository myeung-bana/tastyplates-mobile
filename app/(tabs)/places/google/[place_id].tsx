import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_STUDIO_ADD_REVIEW,
} from '@/constants/screens'
import { fetchGooglePlaceDetails, googlePlacePhotoUrl } from '@/lib/googlePlaces'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import type { MatchedRestaurant } from '@/lib/findTastyPlatesMatch'
import { firstSegmentParam } from '@/lib/routeParams'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; place: PlacesDetailsResult; tpMatch: MatchedRestaurant | null }

export default function GooglePlaceDetailScreen(): JSX.Element {
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
      const [placeDetails, tpMatch] = await Promise.allSettled([
        fetchGooglePlaceDetails(placeId),
        matchRestaurantForPlace({
          placeId,
          name: '',
          address: '',
        }),
      ])

      const place = placeDetails.status === 'fulfilled' ? placeDetails.value : null
      const match = tpMatch.status === 'fulfilled' ? tpMatch.value : null

      if (!place) {
        setState({ status: 'error', message: 'Restaurant not found' })
        return
      }

      setState({ status: 'ready', place, tpMatch: match })
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

  if (state.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </SafeAreaView>
    )
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
          {state.message}
        </Text>
        <Pressable
          onPress={() => void load()}
          className="mt-4 rounded-full px-5 py-2.5"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const { place, tpMatch } = state
  const placeName = place.name?.trim() || 'Restaurant'
  const heroPhoto = place.photos?.[0]?.photo_reference
    ? googlePlacePhotoUrl(place.photos[0].photo_reference, 800)
    : null
  const googleRating = coerceRatingNumber(place.rating)
  const tpRating = coerceRatingNumber(tpMatch?.average_rating)

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <View style={{ height: 260, backgroundColor: '#f3f4f6' }}>
        {heroPhoto ? (
          <Image
            source={{ uri: heroPhoto }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <AppIcon name="restaurant" size={64} color="#d1d5db" />
          </View>
        )}
      </View>

      <View className="px-4 pt-5">
        {tpMatch ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: SCREEN_RESTAURANT_DETAIL,
                params: { slug: tpMatch.slug },
              })
            }
            className="mb-4 flex-row items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-3"
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <AppIcon name="check" size={20} color="white" active />
            </View>
            <View className="flex-1">
              <Text className="font-neusans text-sm font-medium" style={{ color: TEXT_HEADING }}>
                This restaurant is on TastyPlates
              </Text>
              <Text className="font-neusans text-xs" style={{ color: BRAND_PRIMARY }}>
                View {tpMatch.ratings_count ?? 0} reviews →
              </Text>
            </View>
          </Pressable>
        ) : (
          <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <AppIcon name="plus" size={20} color="#9ca3af" />
            </View>
            <View className="flex-1">
              <Text className="font-neusans text-sm font-medium" style={{ color: TEXT_HEADING }}>
                Not on TastyPlates yet
              </Text>
              <Text className="font-neusans text-xs" style={{ color: TEXT_MUTED }}>
                Be the first to add and review this restaurant
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: SCREEN_STUDIO_ADD_REVIEW,
                  params: { prefill_place_id: placeId, prefill_name: placeName },
                })
              }
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="font-neusans text-xs font-medium text-white">Add</Text>
            </Pressable>
          </View>
        )}

        <Text className="mb-1 font-neusans text-2xl font-semibold" style={{ color: TEXT_HEADING }}>
          {placeName}
        </Text>

        {(place.formatted_address ?? place.vicinity) ? (
          <Text className="mb-3 font-neusans text-sm" style={{ color: TEXT_MUTED }}>
            {place.formatted_address ?? place.vicinity}
          </Text>
        ) : null}

        {googleRating != null ? (
          <View className="mb-4 flex-row items-center gap-2 self-start rounded-xl bg-gray-50 px-3 py-2">
            <AppIcon name="logo-google" size={16} color="#4285F4" />
            <AppIcon name="star" size={14} color="#f59e0b" active />
            <Text className="font-neusans text-sm font-medium" style={{ color: TEXT_HEADING }}>
              {googleRating.toFixed(1)}
            </Text>
            {place.user_ratings_total != null ? (
              <Text className="font-neusans text-xs" style={{ color: TEXT_MUTED }}>
                ({place.user_ratings_total.toLocaleString()} Google reviews)
              </Text>
            ) : null}
          </View>
        ) : null}

        {tpRating != null ? (
          <View
            className="mb-4 flex-row items-center gap-2 self-start rounded-xl px-3 py-2"
            style={{ backgroundColor: '#fef7f0' }}
          >
            <AppIcon name="star" size={14} color={BRAND_PRIMARY} active />
            <Text className="font-neusans text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
              {tpRating.toFixed(1)} TastyPlates
            </Text>
            <Text className="font-neusans text-xs text-[#9ca3af]">
              ({tpMatch?.ratings_count ?? 0} reviews)
            </Text>
          </View>
        ) : null}

        <View className="mb-6 flex-row flex-wrap gap-2">
          <Pressable
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`,
              )
            }
            className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
          >
            <AppIcon name="navigation" size={16} color={TEXT_HEADING} />
            <Text className="font-neusans text-sm" style={{ color: TEXT_HEADING }}>
              Directions
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: SCREEN_STUDIO_ADD_REVIEW,
                params: { prefill_place_id: placeId, prefill_name: placeName },
              })
            }
            className="flex-row items-center gap-2 rounded-[50px] px-4 py-2"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <AppIcon name="edit-3" size={16} color="white" />
            <Text className="font-neusans text-sm text-white">Write a Review</Text>
          </Pressable>
        </View>

        {tpMatch ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: SCREEN_RESTAURANT_DETAIL,
                params: { slug: tpMatch.slug },
              })
            }
            className="mb-6 w-full items-center rounded-xl border border-gray-200 py-3"
          >
            <Text className="font-neusans text-sm font-medium" style={{ color: TEXT_HEADING }}>
              View all TastyPlates reviews →
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  )
}
