import { useCallback, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'

import { RestaurantDetailView } from '@/components/restaurant/RestaurantDetailView'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import {
  getRatingSummary,
  getRestaurantBySlug,
  getRestaurantReviewsPreview,
  type RatingSummaryRow,
  type RestaurantDetailRow,
  type RestaurantReviewPreview,
} from '@/services/restaurantDetailService'

type ReadyState = {
  restaurant: RestaurantDetailRow
  summary: RatingSummaryRow | null
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
 * Restaurant detail — `documentation/restaurant.md` §4, `design_system.md` tokens via `constants/brand`.
 */
export default function RestaurantDetailScreen() {
  const navigation = useNavigation()
  const raw = useLocalSearchParams<{ slug: string | string[] }>()
  const slug = slugFromParams(raw.slug)
  const hasSlug = slug.trim().length > 0

  const [refreshing, setRefreshing] = useState(false)
  const [state, setState] = useState<ScreenState>({ status: 'loading' })

  useLayoutEffect(() => {
    if (!hasSlug) {
      router.replace(SCREEN_RESTAURANTS)
    }
  }, [hasSlug])

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
        const [summary, reviewsPayload] = await Promise.all([
          getRatingSummary(restaurant.uuid),
          getRestaurantReviewsPreview(restaurant.uuid, 8),
        ])
        setState({
          status: 'ready',
          restaurant,
          summary,
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

  useLayoutEffect(() => {
    const title = state.status === 'ready' ? state.restaurant.title : 'Restaurant'
    navigation.setOptions({
      title,
      headerLeft: () => (
        <Pressable
          accessibilityLabel="Back to restaurants"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack()
            } else {
              router.replace(SCREEN_RESTAURANTS)
            }
          }}
          className="ml-1 rounded-full p-1 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={28} color={TEXT_HEADING} />
        </Pressable>
      ),
    })
  }, [navigation, state])

  if (!hasSlug) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['bottom']}>
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </SafeAreaView>
    )
  }

  if (state.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['bottom']}>
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </SafeAreaView>
    )
  }

  if (state.status === 'notfound') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6" edges={['bottom']}>
        <Text className="text-center text-lg font-normal" style={{ color: TEXT_HEADING }}>
          Restaurant not found
        </Text>
        <Text className="mt-2 text-center text-sm" style={{ color: TEXT_MUTED }}>
          This listing may have been removed or the link is incorrect.
        </Text>
      </SafeAreaView>
    )
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6" edges={['bottom']}>
        <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
          {state.message}
        </Text>
        <Pressable
          onPress={() => void fetchRestaurant('initial')}
          className="mt-4 rounded-full px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND_PRIMARY }}
        >
          <Text className="font-normal text-white">Retry</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <RestaurantDetailView
        slug={slug}
        restaurant={state.restaurant}
        summary={state.summary}
        reviews={state.reviews}
        reviewTotal={state.reviewTotal}
        refreshing={refreshing}
        onRefresh={() => void fetchRestaurant('refresh')}
      />
    </View>
  )
}
