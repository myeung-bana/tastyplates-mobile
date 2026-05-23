import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'

import { RestaurantDetailView } from '@/components/restaurant/RestaurantDetailView'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { isNoPalateFilter } from '@/lib/palateSearch'
import {
  getRatingSummary,
  getRestaurantBySlug,
  getRestaurantReviewsPreview,
  type RatingSummaryRow,
  type RestaurantDetailRow,
  type RestaurantReviewPreview,
} from '@/services/restaurantDetailService'
import {
  getPreferenceStatsByPalate,
  type PreferenceStat,
} from '@/services/preferenceStatsService'

type ReadyState = {
  restaurant: RestaurantDetailRow
  summary: RatingSummaryRow | null
  reviews: RestaurantReviewPreview[]
  reviewTotal: number
  searchAvg: number | null
  searchCount: number
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

function palateFromParams(palate: string | string[] | undefined): string | null {
  const raw = palate == null ? null : Array.isArray(palate) ? palate[0] : palate
  if (isNoPalateFilter(raw)) return null
  return raw!.trim()
}

/**
 * Restaurant detail — palate-aware Search score via `get-preference-stats`.
 */
export default function RestaurantDetailScreen() {
  const navigation = useNavigation()
  const raw = useLocalSearchParams<{ slug: string | string[]; palate?: string | string[] }>()
  const slug = slugFromParams(raw.slug)
  const palateSlug = useMemo(() => palateFromParams(raw.palate), [raw.palate])
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
        const [summary, reviewsPayload, prefMap] = await Promise.all([
          getRatingSummary(restaurant.uuid),
          getRestaurantReviewsPreview(restaurant.uuid, 8),
          palateSlug
            ? getPreferenceStatsByPalate(palateSlug)
            : Promise.resolve(new Map<number, PreferenceStat>()),
        ])
        const pref = prefMap.get(restaurant.id)
        setState({
          status: 'ready',
          restaurant,
          summary,
          reviews: reviewsPayload.reviews,
          reviewTotal: reviewsPayload.meta.total,
          searchAvg: pref?.avg ?? null,
          searchCount: pref?.count ?? 0,
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
    [slug, palateSlug],
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
        palateSlug={palateSlug}
        searchAvg={state.searchAvg}
        searchCount={state.searchCount}
        refreshing={refreshing}
        onRefresh={() => void fetchRestaurant('refresh')}
      />
    </View>
  )
}
