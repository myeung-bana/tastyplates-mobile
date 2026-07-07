import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { WriteReviewForm } from '@/components/studio/add-review/WriteReviewForm'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useRequireAuthOnMount } from '@/hooks/useRequireAuthOnMount'
import { firstSegmentParam } from '@/lib/routeParams'
import { getRestaurantBySlug, type RestaurantDetailRow } from '@/services/restaurantDetailService'

type BootPhase = 'loading' | 'missing' | 'error' | 'ready'

export default function AddReviewWriteScreen(): JSX.Element {
  useRequireAuthOnMount()

  const params = useLocalSearchParams<{ slug: string | string[] }>()
  const slug = useMemo(() => firstSegmentParam(params.slug).trim(), [params.slug])

  const [restaurant, setRestaurant] = useState<RestaurantDetailRow | null>(null)
  const [phase, setPhase] = useState<BootPhase>('loading')

  useEffect(() => {
    if (!slug.length) {
      setPhase('missing')
      return
    }
    setPhase('loading')
    void getRestaurantBySlug(slug)
      .then((row) => {
        setRestaurant(row)
        setPhase('ready')
      })
      .catch(() => {
        setRestaurant(null)
        setPhase('error')
      })
  }, [slug])

  if (phase === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>
    )
  }

  if (phase === 'missing' || phase === 'error' || !restaurant) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center font-neusans text-base" style={{ color: TEXT_HEADING }}>
          {phase === 'missing' ? 'Missing restaurant slug.' : 'Could not load this restaurant.'}
        </Text>
        <Text
          className="mt-2 text-center font-neusans text-sm"
          style={{ color: TEXT_MUTED }}
          onPress={() => router.back()}
        >
          Go back
        </Text>
      </View>
    )
  }

  const streetFromAddress =
    restaurant.address && typeof restaurant.address.street_address === 'string'
      ? restaurant.address.street_address.trim()
      : ''
  const address = restaurant.listing_street?.trim() || streetFromAddress

  return (
    <View className="flex-1 bg-white">
      <WriteReviewForm
        restaurant={{
          uuid: restaurant.uuid,
          name: restaurant.title,
          address,
          imageUrl: restaurant.featured_image_url,
        }}
      />
    </View>
  )
}
