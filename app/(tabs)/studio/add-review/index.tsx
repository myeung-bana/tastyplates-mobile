import { useCallback, useEffect, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'

import { CuisineFilterPills } from '@/components/studio/add-review/CuisineFilterPills'
import {
  RestaurantDiscoveryNearby,
  RestaurantDiscoveryResults,
} from '@/components/restaurant-search/RestaurantDiscoveryResults'
import { ReviewSearchHelpFooter } from '@/components/reviews/RestaurantMatchInlineMobile'
import { BRAND_PRIMARY, mergeTextInputBodyTypography } from '@/constants/brand'
import {
  SCREEN_STUDIO_ADD_REVIEW_CREATE,
  studioAddReviewWritePath,
} from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import { useRequireAuthOnMount } from '@/hooks/useRequireAuthOnMount'
import { useRestaurantDiscoverySearch } from '@/hooks/useRestaurantDiscoverySearch'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { fetchGooglePlaceDetails } from '@/lib/googlePlaces'
import { castHref, firstSegmentParam } from '@/lib/routeParams'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'
import { toast } from '@/utils/toast'

export default function AddReviewSearchScreen(): JSX.Element {
  useRequireAuthOnMount()

  const prefillRaw = useLocalSearchParams<{
    prefill_place_id?: string | string[]
    prefill_name?: string | string[]
  }>()
  const prefillPlaceId = firstSegmentParam(prefillRaw.prefill_place_id)
  const prefillName = firstSegmentParam(prefillRaw.prefill_name)
  const prefillHandledRef = useRef(false)

  const { location } = useLocation()

  const [query, setQuery] = useState('')
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)

  const placeSelectSeqRef = useRef(0)

  const hasQuery = query.trim().length >= 2
  const idleSearch = !hasQuery && !matching

  const {
    tpResults,
    googleResults,
    loading: searchLoading,
    errors: searchErrors,
    tpNearby,
    nearbyPlaces,
    nearbyLoading,
    nearbyErrors,
  } = useRestaurantDiscoverySearch({
    query,
    location,
    mode: 'listPicker',
    enabled: hasQuery && !matching,
    loadNearby: idleSearch,
    cuisineSlug: activeCuisineFilter,
  })

  const handlePlaceSelect = useCallback(async (placeId: string, name: string) => {
    const seq = ++placeSelectSeqRef.current

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setQuery(name)
    setMatching(true)

    try {
      const placeData = await fetchGooglePlaceDetails(placeId)
      if (seq !== placeSelectSeqRef.current) return

      if (!placeData) {
        toast.error('Could not load restaurant details.')
        return
      }

      const address = placeData.formatted_address ?? placeData.vicinity ?? ''
      const existing = await matchRestaurantForPlace({
        placeId,
        name: placeData.name ?? name,
        address,
        latitude: placeData.geometry?.location?.lat,
        longitude: placeData.geometry?.location?.lng,
      })

      if (seq !== placeSelectSeqRef.current) return

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      if (existing?.slug) {
        router.replace(castHref(studioAddReviewWritePath(existing.slug)))
      } else {
        router.replace({
          pathname: SCREEN_STUDIO_ADD_REVIEW_CREATE,
          params: { placeData: JSON.stringify(placeData) },
        })
      }
    } catch {
      if (seq === placeSelectSeqRef.current) {
        toast.error('Something went wrong. Please try again.')
      }
    } finally {
      if (seq === placeSelectSeqRef.current) {
        setMatching(false)
      }
    }
  }, [])

  useEffect(() => {
    if (prefillHandledRef.current) return
    if (!prefillPlaceId || !prefillName) return
    prefillHandledRef.current = true
    void handlePlaceSelect(prefillPlaceId, prefillName)
  }, [handlePlaceSelect, prefillName, prefillPlaceId])

  const handleSelectResult = useCallback(
    (result: RestaurantSearchResult) => {
      if (isTPResult(result) && result.slug) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.replace(castHref(studioAddReviewWritePath(result.slug)))
        return
      }
      if (isGoogleResult(result)) {
        void handlePlaceSelect(result.place_id, result.title)
      }
    },
    [handlePlaceSelect],
  )

  const onPickNearby = useCallback(
    (row: NearbyPlaceRow) => {
      if (!row.place_id) return
      void handlePlaceSelect(row.place_id, row.name)
    },
    [handlePlaceSelect],
  )

  const onPickTpNearby = useCallback((result: RestaurantSearchResult) => {
    if (!isTPResult(result) || !result.slug) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.replace(castHref(studioAddReviewWritePath(result.slug)))
  }, [])

  const clearSearch = useCallback(() => {
    placeSelectSeqRef.current += 1
    setQuery('')
    setMatching(false)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
      <View className="border-b border-gray-100 bg-white">
        <View className="mx-4 my-3 flex-row items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-2.5">
          <AppIcon name="search" size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search restaurants..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            className="flex-1 font-neusans text-[15px] text-[#31343F]"
            style={mergeTextInputBodyTypography({ fontSize: 16 })}
            editable={!matching}
          />
          {searchLoading ? <ActivityIndicator size="small" color={BRAND_PRIMARY} /> : null}
          {query.length > 0 && !searchLoading ? (
            <Pressable accessibilityRole="button" onPress={clearSearch} hitSlop={8}>
              <AppIcon name="x" size={16} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <CuisineFilterPills
          activeCuisineFilter={activeCuisineFilter}
          onSelect={setActiveCuisineFilter}
        />
      </View>

      {matching ? (
        <View className="items-center py-8">
          <ActivityIndicator color={BRAND_PRIMARY} />
          <Text className="mt-3 font-neusans text-sm text-[#6b7280]">Checking restaurant…</Text>
        </View>
      ) : hasQuery ? (
        <RestaurantDiscoveryResults
          keyword={query.trim()}
          variant="navigate"
          loading={searchLoading}
          tpResults={tpResults}
          googleResults={googleResults}
          errors={searchErrors}
          onSelect={handleSelectResult}
        />
      ) : (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <RestaurantDiscoveryNearby
            tpResults={tpNearby}
            places={nearbyPlaces}
            loading={nearbyLoading}
            variant="navigate"
            errors={nearbyErrors}
            onSelectTp={onPickTpNearby}
            onSelectNearby={onPickNearby}
          />
          <ReviewSearchHelpFooter />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
