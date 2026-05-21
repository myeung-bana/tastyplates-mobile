import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import {
  RestaurantMatchInlineMobile,
  ReviewSearchHelpFooter,
} from '@/components/reviews/RestaurantMatchInlineMobile'
import { GlobalLocationPill } from '@/components/navigation/GlobalLocationPill'
import { BORDER_SUBTLE, BRAND_PRIMARY, mergeTextInputBodyTypography, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useLocation } from '@/contexts/LocationContext'
import {
  SCREEN_STUDIO_ADD_REVIEW_CREATE,
  studioAddReviewWritePath,
} from '@/constants/screens'
import { castHref } from '@/lib/routeParams'
import { matchRestaurantFlexible, type MatchedRestaurant } from '@/lib/findTastyPlatesMatch'
import {
  autocompletePlacesEstablishments,
  fetchGooglePlaceDetails,
  getNearbyRestaurants,
  googlePlacePhotoUrl,
  type NearbyPlaceRow,
  type PlacesAutocompletePrediction,
} from '@/lib/googlePlaces'
import { formatLocationDisplay } from '@/utils/locationUtils'

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

/** Autocomplete §3 — nearby list + gastronomy-heavy predictions + Places-to-TP match. */
export default function AddReviewSearchScreen(): JSX.Element {
  const { location, hierarchy } = useLocation()
  const hierarchyCountries = hierarchy?.hierarchy.countries ?? null
  const localityLine = formatLocationDisplay(location, hierarchyCountries)

  const hasAnchoredCoordinates = useMemo(() => {
    const c = location.coordinates
    return (
      c != null && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
    )
  }, [location.coordinates])

  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacesAutocompletePrediction[]>([])
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)

  const [matching, setMatching] = useState(false)
  const [chosen, setChosen] = useState<PlacesAutocompletePrediction | null>(null)
  const [matched, setMatched] = useState<MatchedRestaurant[]>([])

  const debouncingRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined)

  const idleSearch = useMemo(() => !query.trim() && chosen === null, [chosen, query])

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
  }, [
    location.key,
    location.coordinates?.latitude,
    location.coordinates?.longitude,
  ])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || chosen) {
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
  }, [chosen, location.coordinates, query])

  const onSelectPrediction = useCallback(async (prediction: PlacesAutocompletePrediction) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setChosen(prediction)
    setPredictions([])
    setQuery(prediction.description)
    setSearchingPlaces(true)
    setMatching(true)
    setMatched([])

    try {
      const details = await fetchGooglePlaceDetails(prediction.place_id)

      const name =
        details?.name?.trim() ||
        prediction.structured_formatting?.main_text ||
        prediction.description.split(',')[0] ||
        'Unknown'

      const address =
        details?.formatted_address ||
        prediction.structured_formatting?.secondary_text ||
        prediction.description.split(',').slice(1).join(',').trim()

      const matches = await matchRestaurantFlexible({
        placeId: prediction.place_id,
        name,
        address,
      })
      setMatched(matches)
    } catch {
      setMatched([])
    } finally {
      setSearchingPlaces(false)
      setMatching(false)
    }
  }, [])

  const onPickNearby = useCallback(
    async (row: NearbyPlaceRow) => {
      if (!row.place_id) return
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      const fakePrediction: PlacesAutocompletePrediction = {
        place_id: row.place_id,
        description: `${row.name}${row.address ? `, ${row.address}` : ''}`,
        structured_formatting: {
          main_text: row.name,
          secondary_text: row.address ?? '',
        },
        types: row.types ?? ['restaurant'],
      }

      await onSelectPrediction(fakePrediction)
    },
    [onSelectPrediction],
  )

  const subtitle = chosen ?
      'Matched against Nhost restaurants-v2/match-restaurant (place ID first).'
    : 'Pick a venue from Nearby or Google, then verify the match.'

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1 px-5"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-10 pt-2"
        >
          <View className="flex-row items-center justify-between pb-4 pt-1">
            <Text className="text-3xl font-bold" style={{ color: TEXT_HEADING }}>
              Create review
            </Text>
            <GlobalLocationPill maxWidth={148} />
          </View>

          <Text className="pb-2 text-xs" style={{ color: TEXT_MUTED }}>
            Searching in{' '}
            <Text style={{ fontWeight: '600', color: TEXT_HEADING }}>{localityLine}</Text>
          </Text>
          <Text className="pb-5 text-center text-xs leading-snug" style={{ color: TEXT_MUTED }}>
            {subtitle}
          </Text>

          <TextInput
            editable={chosen == null}
            value={query}
            placeholder="Search restaurants…"
            placeholderTextColor={TEXT_MUTED}
            onChangeText={(t) => {
              setChosen(null)
              setMatched([])
              setQuery(t)
            }}
            className="rounded-3xl border px-4 py-3 text-[16px]"
            style={mergeTextInputBodyTypography({
              borderColor: BORDER_SUBTLE,
              color: TEXT_HEADING,
              opacity: chosen ? 0.65 : 1,
              backgroundColor: '#fafafa',
            })}
          />

          {searchingPlaces && !chosen ? (
            <View className="mt-3 flex-row items-center gap-2">
              <ActivityIndicator color={BRAND_PRIMARY} />
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                Searching Google Places…
              </Text>
            </View>
          ) : null}

          {idleSearch ? (
            <View className="mt-6">
              <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
                Nearby
              </Text>
              {nearbyLoading ? (
                <View className="items-center py-10">
                  <ActivityIndicator color={BRAND_PRIMARY} />
                </View>
              ) : nearbyPlaces.length === 0 ? (
                <Text className="py-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
                  {hasAnchoredCoordinates ?
                    'No nearby restaurants loaded. Try spelling the name.'
                  : 'Pick a region with coordinates to see nearby picks.'}
                </Text>
              ) : (
                nearbyPlaces.map((row) => (
                  <Pressable
                    key={row.place_id}
                    accessibilityRole="button"
                    onPress={() => void onPickNearby(row)}
                    className="flex-row gap-3 border-b py-4"
                    style={{ borderBottomColor: '#f3f4f6' }}
                  >
                    <View className="pt-1">
                      <Ionicons name="location-outline" size={20} color={BRAND_PRIMARY} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }} numberOfLines={2}>
                        {row.name}
                      </Text>
                      {row.address ? (
                        <Text className="mt-1 text-xs" style={{ color: TEXT_MUTED }} numberOfLines={3}>
                          {row.address}
                        </Text>
                      ) : null}
                      {typeof row.google_rating === 'number' ? (
                        <Text className="mt-1 text-xs font-medium text-amber-600">
                          Google {row.google_rating.toFixed(1)} ★
                        </Text>
                      ) : null}
                    </View>
                    {row.photo_reference ?
                      <Image
                        accessibilityIgnoresInvertColors
                        source={{ uri: googlePlacePhotoUrl(row.photo_reference, 144) }}
                        style={{ width: 56, height: 56, borderRadius: 10 }}
                      />
                    : null}
                  </Pressable>
                ))
              )}
            </View>
          ) : null}

          {!chosen && predictions.length ?
            <>
              <Text className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
                All results
              </Text>
              {predictions.map((prediction) => (
                <Pressable
                  accessibilityRole="button"
                  key={prediction.place_id}
                  onPress={() => void onSelectPrediction(prediction)}
                  className="border-b py-4"
                  style={{ borderBottomColor: '#f3f4f6' }}
                >
                  <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
                    {prediction.structured_formatting?.main_text ?? prediction.description}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
                    {prediction.structured_formatting?.secondary_text ?? ''}
                  </Text>
                </Pressable>
              ))}
            </>
          : null}

          <RestaurantMatchInlineMobile
            matching={matching}
            chosen={chosen}
            matched={matched}
            onWriteReviewSlug={(slug) =>
              router.push(castHref(studioAddReviewWritePath(slug)))
            }
            onCreateListingPress={() => {
              if (!chosen) return
              router.push({
                pathname: SCREEN_STUDIO_ADD_REVIEW_CREATE,
                params: { placeId: chosen.place_id, label: chosen.description },
              })
            }}
            onPickDifferentVenue={() => {
              void Haptics.selectionAsync()
              setChosen(null)
              setMatched([])
              setQuery('')
            }}
          />

          {!chosen ? <ReviewSearchHelpFooter /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
