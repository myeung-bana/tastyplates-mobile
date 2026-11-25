import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useNavigation } from 'expo-router'

import { RestaurantDetailSkeleton } from '@/components/restaurant/RestaurantDetailSkeleton'
import { RestaurantDetailView } from '@/components/restaurant/RestaurantDetailView'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useAuth } from '@/hooks/useAuth'
import { getRestaurantScores, type RestaurantScores } from '@/services/readingService'
import {
  getRestaurantBySlug,
  getRestaurantReviewsPreview,
  type RestaurantDetailRow,
  type RestaurantReviewPreview,
} from '@/services/restaurantDetailService'

type ReadyState = {
  restaurant: RestaurantDetailRow
  reviews: RestaurantReviewPreview[]
  reviewTotal: number
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'notfound' }
  | ({ status: 'ready' } & ReadyState)

function slugFromParams(slug: string | string[] | undefined): string {
  if (slug == null) return ''
  return Array.isArray(slug) ? (slug[0] ?? '') : slug
}

/**
 * Restaurant detail. Scores come from `restaurants-v2/get-restaurant-scores`, which also picks the
 * viewer's palate score — the app no longer decides it from route params.
 */
export default function RestaurantDetailScreen() {
  const navigation = useNavigation()
  const raw = useLocalSearchParams<{ slug: string | string[] }>()
  const slug = slugFromParams(raw.slug)
  const { isAuthenticated } = useAuth()
  const hasSlug = slug.trim().length > 0

  const [refreshing, setRefreshing] = useState(false)
  const [state, setState] = useState<ScreenState>({ status: 'loading' })

  const restaurantUuid =
    state.status === 'ready' ? state.restaurant.uuid : null

  const [scores, setScores] = useState<RestaurantScores | null>(null)
  const [scoresLoading, setScoresLoading] = useState(false)
  const [scoresError, setScoresError] = useState<string | null>(null)

  const loadScores = useCallback(async (uuid: string) => {
    setScoresLoading(true)
    setScoresError(null)
    try {
      setScores(await getRestaurantScores(uuid))
    } catch (e) {
      if (__DEV__) console.warn('[restaurant scores]', e)
      setScoresError('Couldn’t load scores. Pull to refresh.')
    } finally {
      setScoresLoading(false)
    }
  }, [])

  // Reload when the restaurant changes or the viewer signs in / out (the palate score is theirs).
  useEffect(() => {
    if (restaurantUuid) void loadScores(restaurantUuid)
  }, [isAuthenticated, loadScores, restaurantUuid])

  useLayoutEffect(() => {
    if (!hasSlug) {
      navigation.navigate('index')
    }
  }, [hasSlug, navigation])

  const fetchRestaurant = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!slug.trim()) {
        return
      }
      if (mode === 'refresh') {
        setRefreshing(true)
      } else {
        setState({ status: 'loading' })
      }
      try {
        const restaurant = await getRestaurantBySlug(slug.trim())
        const reviewsPayload = await getRestaurantReviewsPreview(restaurant.uuid, 8)
        setState({
          status: 'ready',
          restaurant,
          reviews: reviewsPayload.reviews,
          reviewTotal: reviewsPayload.meta.total,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load restaurant'
        if (/not\s*found/i.test(msg)) {
          setState({ status: 'notfound' })
        } else {
          setState({ status: 'error', message: msg })
        }
      } finally {
        if (mode === 'refresh') setRefreshing(false)
      }
    },
    [slug],
  )

  useLayoutEffect(() => {
    if (!hasSlug) return
    void fetchRestaurant('initial')
  }, [fetchRestaurant, hasSlug])

  const handleRefresh = useCallback(() => {
    void fetchRestaurant('refresh')
    if (restaurantUuid) void loadScores(restaurantUuid)
  }, [fetchRestaurant, loadScores, restaurantUuid])

  // Loading / error keep a plain header; the loaded page draws its own back + share over the photo (design S5).
  useLayoutEffect(() => {
    const ready = state.status === 'ready'
    navigation.setOptions({
      title: ready ? state.restaurant.title : 'Restaurant',
      headerShown: !ready,
    })
  }, [navigation, state])

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack()
    else navigation.navigate('index')
  }, [navigation])

  if (!hasSlug) {
    return null
  }

  if (state.status === 'loading') {
    return (
      <View className="flex-1 bg-white">
        <RestaurantDetailSkeleton />
      </View>
    )
  }

  if (state.status === 'notfound') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6" edges={['bottom']}>
        <Text className="text-center text-lg font-body" style={{ color: TEXT_HEADING }}>
          Restaurant not found
        </Text>
        <Text className="mt-2 text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
          This listing may have been removed or the link is incorrect.
        </Text>
      </SafeAreaView>
    )
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6" edges={['bottom']}>
        <Text className="text-center text-sm font-body" style={{ color: TEXT_MUTED }}>
          {state.message}
        </Text>
        <Pressable
          onPress={() => void fetchRestaurant('initial')}
          className="mt-4 rounded-full px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Text className="text-white font-body">Retry</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <RestaurantDetailView
        slug={slug}
        restaurant={state.restaurant}
        reviews={state.reviews}
        reviewTotal={state.reviewTotal}
        scores={scores}
        scoresLoading={scoresLoading}
        scoresError={scoresError}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onBack={goBack}
      />
    </View>
  )
}
