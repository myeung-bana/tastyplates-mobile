import { useCallback, useMemo } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'

import { ExploreResultRow } from '@/components/restaurant/ExploreResultRow'
import { BRAND_PRIMARY, BRAND_PRIMARY_TINT, SURFACE_CARD, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PLACES_GOOGLE_DETAIL, SCREEN_RESTAURANT_DETAIL } from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useLocation } from '@/contexts/LocationContext'
import { preferenceStatForSearchResult, usePersonalisedRestaurants } from '@/hooks/usePersonalisedRestaurants'
import { useUserPalate } from '@/hooks/useUserPalate'
import { labelForPalateKey } from '@/lib/palateLabels'
import { browseCardPropsFromSearchResult, cityNameFromLocation } from '@/lib/restaurantDiscoveryHelpers'
import { restaurantSearchResultId } from '@/lib/restaurantSearchMerge'
import { firstSegmentParam } from '@/lib/routeParams'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult } from '@/types/restaurantSearchResult'

/**
 * `/restaurants/cuisines/[slug]` (design S7): a dedicated cuisine browse for the current city,
 * sorted by that cuisine's score. Quick finds open Explore instead; this is for flows that push here.
 */
export default function CuisineListingScreen(): JSX.Element {
  const router = useRouter()
  const params = useLocalSearchParams<{ slug: string | string[] }>()
  const cuisine = firstSegmentParam(params.slug).trim().toLowerCase()
  const label = labelForPalateKey(cuisine)
  const { location } = useLocation()
  const { palate } = useUserPalate()
  const inPalate = Boolean(palate?.includes(cuisine))
  const cityName = useMemo(() => cityNameFromLocation(location), [location])

  const { displayRows, loading, loadingMore, refreshing, error, isPersonalised, getForRestaurantUuid, refresh, loadMore } =
    usePersonalisedRestaurants({
      cuisineParam: cuisine,
      categoryParam: null,
      searchQuery: undefined,
      locationKey: location.key,
      coordinates: location.coordinates ?? null,
      cityName,
    })

  const open = useCallback(
    (item: RestaurantSearchResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      if (isTPResult(item)) {
        router.push({ pathname: SCREEN_RESTAURANT_DETAIL, params: { slug: item.slug, cuisine } })
      } else {
        router.push({ pathname: SCREEN_PLACES_GOOGLE_DETAIL, params: { place_id: item.place_id } })
      }
    },
    [cuisine, router],
  )

  const header = (
    <View style={{ paddingTop: 8, paddingBottom: 8, gap: 6 }}>
      <Text accessibilityRole="header" style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 33, color: TEXT_HEADING }}>
        {label} in {location.label}
      </Text>
      <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>
        {loading ? 'Loading places…' : `${displayRows.length} places · sorted by ${label} score`}
      </Text>
      {inPalate ? (
        <View style={{ marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFE2C7', backgroundColor: BRAND_PRIMARY_TINT, padding: 12 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 17, color: TEXT_HEADING }}>
            {label} is in your palate, so places reviewed by people who share it come first.
          </Text>
        </View>
      ) : null}
      {error && displayRows.length === 0 ? (
        <Text style={{ marginTop: 12, fontFamily: FONT.body, fontSize: 13, color: '#D93A2B' }}>{error}</Text>
      ) : null}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_CARD }}>
      <Stack.Screen options={{ title: label }} />
      {loading && displayRows.length === 0 ? (
        <View style={{ paddingHorizontal: 20 }}>
          {header}
          <ActivityIndicator color={BRAND_PRIMARY} style={{ marginTop: 24 }} />
        </View>
      ) : (
        <FlatList
          data={displayRows}
          keyExtractor={(item) => restaurantSearchResultId(item)}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderItem={({ item }) => {
            const stat = isPersonalised ? preferenceStatForSearchResult(item, getForRestaurantUuid) : null
            const props = browseCardPropsFromSearchResult(item, { isPersonalised, cityLabel: location.label, palateStat: stat })
            const avg = props.ratingMode === 'palate-match' ? props.searchPalateRating : null
            return (
              <ExploreResultRow
                result={item}
                subtitle={props.subtitle}
                rating={props.rating}
                activeCuisine={cuisine}
                palateMatchPercent={avg != null ? Math.round((avg / 5) * 100) : null}
                onPress={() => open(item)}
              />
            )
          }}
          ListEmptyComponent={
            <Text style={{ marginTop: 24, fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED, textAlign: 'center' }}>
              No {label} places in {location.label} yet.
            </Text>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={BRAND_PRIMARY} style={{ marginVertical: 16 }} /> : null}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh({ isPullRefresh: true })} tintColor={BRAND_PRIMARY} />
          }
        />
      )}
    </View>
  )
}
