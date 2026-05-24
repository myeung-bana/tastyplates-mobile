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
import { router } from 'expo-router'

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
  SCREEN_STUDIO_ADD_REVIEW_CREATE,
  studioAddReviewWritePath,
} from '@/constants/screens'
import { useLocation } from '@/contexts/LocationContext'
import { useRequireAuthOnMount } from '@/hooks/useRequireAuthOnMount'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import {
  autocompletePlacesEstablishments,
  fetchGooglePlaceDetails,
  getNearbyRestaurants,
  type NearbyPlaceRow,
  type PlacesAutocompletePrediction,
} from '@/lib/googlePlaces'
import { castHref } from '@/lib/routeParams'
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
  const filtered = rows.filter((p) => {
    const types = p.types ?? []
    if (types.length === 0) return true
    return types.some((t) => GASTRONOMY_TYPES.some((k) => t.includes(k)))
  })
  return filtered.sort((a, b) => gastronomyScore(b.types) - gastronomyScore(a.types))
}

function filterNearbyByCuisine(rows: NearbyPlaceRow[], slug: string | null): NearbyPlaceRow[] {
  if (!slug) return rows
  return rows.filter((row) => {
    const types = row.types ?? []
    return types.some((t) => t.includes(slug.replace(/-/g, '_')))
  })
}

export default function AddReviewSearchScreen(): JSX.Element {
  useRequireAuthOnMount()

  const { location, hierarchy } = useLocation()
  const hierarchyCountries = hierarchy?.hierarchy.countries ?? null
  const localityLine = formatLocationDisplay(location, hierarchyCountries)

  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)

  const debouncingRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined)
  const placeSelectSeqRef = useRef(0)

  const hasQuery = query.trim().length > 0
  const idleSearch = !hasQuery && !matching

  const filteredNearby = useMemo(
    () => filterNearbyByCuisine(nearbyPlaces, activeCuisineFilter),
    [nearbyPlaces, activeCuisineFilter],
  )

  useEffect(() => {
    let cancelled = false
    const coords = location.coordinates
    if (
      coords == null ||
      !Number.isFinite(coords.latitude) ||
      !Number.isFinite(coords.longitude)
    ) {
      setNearbyPlaces([])
      setNearbyLoading(false)
      return
    }
    setNearbyLoading(true)
    void getNearbyRestaurants(coords, 1500).then((rows) => {
      if (!cancelled) setNearbyPlaces(rows)
      if (!cancelled) setNearbyLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [location.key, location.coordinates?.latitude, location.coordinates?.longitude])

  useEffect(() => {
    if (!hasQuery || matching) {
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
  }, [hasQuery, location.coordinates, query, matching])

  const handlePlaceSelect = useCallback(async (placeId: string, name: string) => {
    const seq = ++placeSelectSeqRef.current

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setQuery(name)
    setPredictions([])
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

  const onPickNearby = useCallback(
    (row: NearbyPlaceRow) => {
      if (!row.place_id) return
      void handlePlaceSelect(row.place_id, row.name)
    },
    [handlePlaceSelect],
  )

  const clearSearch = useCallback(() => {
    placeSelectSeqRef.current += 1
    setQuery('')
    setPredictions([])
    setMatching(false)
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
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
            editable={!matching}
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
        {matching ? (
          <View className="items-center py-8">
            <ActivityIndicator color={BRAND_PRIMARY} />
            <Text className="mt-3 font-neusans text-sm text-[#6b7280]">Checking restaurant…</Text>
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
                  onPress={() => onPickNearby(row)}
                />
              ))
            )}
          </>
        ) : null}

        {hasQuery && !matching ? (
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

        {!matching ? <ReviewSearchHelpFooter /> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
