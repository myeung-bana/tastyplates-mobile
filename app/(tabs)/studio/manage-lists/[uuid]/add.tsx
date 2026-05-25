/**
 * Add a restaurant to a curated list.
 *
 * Identical search UX to /studio/add-review (same search bar, debounced
 * autocomplete, cuisine pills, nearby list) — only the submit handler differs:
 * calls `POST add-item` instead of navigating to the review form.
 *
 * Linked to add-review/index.tsx — keep in sync if search infra changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'

import { CuisineFilterPills } from '@/components/studio/add-review/CuisineFilterPills'
import {
  NearbyEmptyState,
  NearbyRestaurantRow,
  NearbySkeletonList,
  SearchEmptyState,
  SearchPredictionRow,
  SectionHeader,
} from '@/components/studio/add-review/RestaurantSearchRows'
import { ReviewSearchHelpFooter } from '@/components/reviews/RestaurantMatchInlineMobile'
import { BRAND_PRIMARY, mergeTextInputBodyTypography } from '@/constants/brand'
import {
  listItemAddedSuccess,
  listItemAddError,
  listItemDuplicateError,
} from '@/constants/messages'
import { useLocation } from '@/contexts/LocationContext'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import {
  autocompletePlacesEstablishments,
  fetchGooglePlaceDetails,
  getNearbyRestaurants,
  type NearbyPlaceRow,
  type PlacesAutocompletePrediction,
} from '@/lib/googlePlaces'
import { firstSegmentParam } from '@/lib/routeParams'
import { addListItem } from '@/services/restaurantListService'
import { formatLocationDisplay } from '@/utils/locationUtils'
import { toast } from '@/utils/toast'

const DEBOUNCE_MS = 300
const GASTRONOMY_TYPES = ['restaurant', 'food', 'meal', 'cafe', 'bakery', 'bar']

function gastronomyScore(types: string[] | undefined): number {
  if (!types?.length) return 0
  let v = 0
  if (types.some((x) => x.includes('restaurant'))) v += 3
  if (types.some((x) => GASTRONOMY_TYPES.some((k) => k !== 'restaurant' && x.includes(k)))) v += 2
  if (types.some((x) => x.includes('establishment'))) v += 1
  return v
}

function filterAndSortEstablishments(rows: PlacesAutocompletePrediction[]): PlacesAutocompletePrediction[] {
  return rows
    .filter((p) => {
      const types = p.types ?? []
      return types.length === 0 || types.some((t) => GASTRONOMY_TYPES.some((k) => t.includes(k)))
    })
    .sort((a, b) => gastronomyScore(b.types) - gastronomyScore(a.types))
}

function filterNearbyByCuisine(rows: NearbyPlaceRow[], slug: string | null): NearbyPlaceRow[] {
  if (!slug) return rows
  return rows.filter((row) =>
    (row.types ?? []).some((t) => t.includes(slug.replace(/-/g, '_'))),
  )
}

export default function AddRestaurantToListScreen(): JSX.Element {
  const params = useLocalSearchParams()
  const listUuid = firstSegmentParam(params.uuid)

  const { location, hierarchy } = useLocation()
  const hierarchyCountries = hierarchy?.hierarchy.countries ?? null
  const localityLine = formatLocationDisplay(location, hierarchyCountries)

  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const debouncingRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined)
  const selectSeqRef = useRef(0)

  const hasQuery = query.trim().length > 0
  const idleSearch = !hasQuery && !adding

  const filteredNearby = useMemo(
    () => filterNearbyByCuisine(nearbyPlaces, activeCuisineFilter),
    [nearbyPlaces, activeCuisineFilter],
  )

  // Load nearby on mount
  useEffect(() => {
    let cancelled = false
    const coords = location.coordinates
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      setNearbyPlaces([])
      setNearbyLoading(false)
      return
    }
    setNearbyLoading(true)
    void getNearbyRestaurants(coords, 1500).then((rows) => {
      if (!cancelled) setNearbyPlaces(rows)
      if (!cancelled) setNearbyLoading(false)
    })
    return () => { cancelled = true }
  }, [location.key, location.coordinates?.latitude, location.coordinates?.longitude])

  // Debounced autocomplete
  useEffect(() => {
    if (!hasQuery || adding) {
      setSearchingPlaces(false)
      setPredictions([])
      return
    }
    if (debouncingRef.current) clearTimeout(debouncingRef.current)
    setSearchingPlaces(true)
    debouncingRef.current = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const rows = await autocompletePlacesEstablishments(query, location.coordinates)
          setPredictions(filterAndSortEstablishments(rows))
        } catch {
          setPredictions([])
        } finally {
          setSearchingPlaces(false)
        }
      })()
    }, DEBOUNCE_MS)
    return () => {
      if (debouncingRef.current) clearTimeout(debouncingRef.current)
    }
  }, [hasQuery, location.coordinates, query, adding])

  const handlePlaceSelect = useCallback(
    async (placeId: string, name: string) => {
      const seq = ++selectSeqRef.current
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setQuery(name)
      setPredictions([])
      setAdding(true)

      try {
        const placeData = await fetchGooglePlaceDetails(placeId)
        if (seq !== selectSeqRef.current) return
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
        if (seq !== selectSeqRef.current) return

        await addListItem({
          list_uuid: listUuid,
          restaurant_uuid: existing?.uuid ?? undefined,
          google_place_id: placeId,
        })

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        toast.success(listItemAddedSuccess(placeData.name ?? name))
        router.back()
      } catch (err) {
        if (seq !== selectSeqRef.current) return
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('409') || msg.toLowerCase().includes('already in list')) {
          toast.error(listItemDuplicateError)
        } else {
          toast.error(listItemAddError)
        }
      } finally {
        if (seq === selectSeqRef.current) setAdding(false)
      }
    },
    [listUuid],
  )

  const clearSearch = useCallback(() => {
    selectSeqRef.current += 1
    setQuery('')
    setPredictions([])
    setAdding(false)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
      {/* Search bar */}
      <View className="border-b border-gray-100 bg-white">
        <View className="mx-4 my-3 flex-row items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-2.5">
          <Feather name="search" size={18} color="#9ca3af" />
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
            editable={!adding}
          />
          {searchingPlaces ? <ActivityIndicator size="small" color={BRAND_PRIMARY} /> : null}
          {hasQuery && !searchingPlaces ? (
            <Pressable accessibilityRole="button" onPress={clearSearch} hitSlop={8}>
              <Feather name="x" size={16} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
        <Text className="px-5 font-neusans text-xs text-[#9ca3af]">
          Searching in 🏳 {localityLine}
        </Text>
      </View>

      {/* Cuisine pills */}
      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <CuisineFilterPills
          activeCuisineFilter={activeCuisineFilter}
          onSelect={setActiveCuisineFilter}
        />
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 0, paddingBottom: 24 }}
      >
        {adding ? (
          <View className="items-center py-8">
            <ActivityIndicator color={BRAND_PRIMARY} />
            <Text className="mt-3 font-neusans text-sm text-[#6b7280]">Adding to list…</Text>
          </View>
        ) : null}

        {idleSearch ? (
          <>
            <SectionHeader title="Nearby" />
            {nearbyLoading ? (
              <NearbySkeletonList />
            ) : filteredNearby.length === 0 ? (
              <NearbyEmptyState />
            ) : (
              filteredNearby.map((row) => (
                <NearbyRestaurantRow
                  key={row.place_id}
                  row={row}
                  onPress={() => {
                    if (row.place_id) void handlePlaceSelect(row.place_id, row.name)
                  }}
                />
              ))
            )}
          </>
        ) : null}

        {hasQuery && !adding ? (
          <>
            {searchingPlaces ? (
              <View className="flex-row items-center gap-2 px-4 py-3">
                <ActivityIndicator size="small" color={BRAND_PRIMARY} />
              </View>
            ) : (
              <SectionHeader title="All Results" />
            )}
            {!searchingPlaces && predictions.length === 0 ? <SearchEmptyState /> : null}
            {!searchingPlaces
              ? predictions.map((p) => (
                  <SearchPredictionRow
                    key={p.place_id}
                    prediction={p}
                    onPress={() =>
                      void handlePlaceSelect(
                        p.place_id,
                        p.structured_formatting?.main_text ?? p.description,
                      )
                    }
                  />
                ))
              : null}
          </>
        ) : null}

        {!adding ? <ReviewSearchHelpFooter /> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
