import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { RestaurantDetailSkeleton } from '@/components/restaurant/RestaurantDetailSkeleton'
import { RestaurantDetailShareHeaderButton } from '@/components/restaurant/RestaurantDetailShareHeaderButton'
import { RestaurantDetailView } from '@/components/restaurant/RestaurantDetailView'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { cuisineParamFromRouteParams, useRestaurantScores } from '@/hooks/useRestaurantScores'
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
 * Restaurant detail — cuisine-aware Search / Your score via trust-set preference stats.
 */
export default function RestaurantDetailScreen() {
  const navigation = useNavigation()
  const raw = useLocalSearchParams<{
    slug: string | string[]
    cuisine?: string | string[]
    palate?: string | string[]
  }>()
  const slug = slugFromParams(raw.slug)
  const cuisineParam = useMemo(() => cuisineParamFromRouteParams(raw), [raw.cuisine, raw.palate])
  const hasSlug = slug.trim().length > 0

  const [refreshing, setRefreshing] = useState(false)
  const [state, setState] = useState<ScreenState>({ status: 'loading' })

  const restaurantUuid =
    state.status === 'ready' ? state.restaurant.uuid : null

  const {
    summary,
    searchAvg,
    searchCount,
    searchMode,
    searchGroupName,
    searchUnlocked,
    sharedAvg,
    sharedCount,
    sharedUnlocked,
    isPersonalised,
    trustSet,
    cuisineFilterActive,
    loading: scoresLoading,
    error: scoresError,
    refresh: refreshScores,
  } = useRestaurantScores({
    restaurantUuid,
    cuisineParam,
    enabled: state.status === 'ready',
  })

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
    void refreshScores()
  }, [fetchRestaurant, refreshScores])

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
              navigation.navigate('index')
            }
          }}
          className="ml-1 rounded-full p-1 active:opacity-70"
        >
          <AppIcon name="chevron-left" size={28} color={TEXT_HEADING} />
        </Pressable>
      ),
      headerRight:
        state.status === 'ready'
          ? () => (
              <RestaurantDetailShareHeaderButton
                title={state.restaurant.title}
                slug={slug}
              />
            )
          : undefined,
    })
  }, [navigation, slug, state])

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
        summary={summary}
        reviews={state.reviews}
        reviewTotal={state.reviewTotal}
        searchAvg={searchAvg}
        searchCount={searchCount}
        searchMode={searchMode}
        searchGroupName={searchGroupName}
        searchUnlocked={searchUnlocked}
        sharedAvg={sharedAvg}
        sharedCount={sharedCount}
        sharedUnlocked={sharedUnlocked}
        isPersonalised={isPersonalised}
        trustSet={trustSet}
        cuisineFilterActive={cuisineFilterActive}
        scoresLoading={scoresLoading}
        scoresError={scoresError}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  )
}
