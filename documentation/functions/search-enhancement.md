# search-enhancement.md — Hybrid Restaurant Search: TastyPlates + Google Places

> **Grounded in:** Full source of `app/(tabs)/restaurants/index.tsx`, `services/restaurantsV2Service.ts`, `services/restaurantService.ts`, `lib/googlePlaces.ts`, `lib/findTastyPlatesMatch.ts` from `tastyplates-mobile` and `functions/restaurants-v2/get-restaurants.ts` from `tastyplates-nhost` — all read in full.

---

## 1. The Problem, Stated Precisely

The current `get-restaurants.ts` function queries `restaurants` in Hasura with `status = 'publish'`. It returns only rows that exist in your database. In cities or neighbourhoods where your team has not yet seeded restaurant data, the list is empty. The UI shows `"No restaurants match your filters."` — which looks like a broken app to a new user.

The infrastructure to fix this already exists in the codebase:

- `lib/googlePlaces.ts` — `getNearbyRestaurants()`, `autocompletePlacesEstablishments()`, `fetchGooglePlaceDetails()` are all implemented
- `lib/findTastyPlatesMatch.ts` — `matchRestaurantFlexible()` already calls `restaurants-v2/match-restaurant` to check if a Google place exists in the DB
- `RestaurantListRow` already has `_distance` as an optional field
- The search input in `index.tsx` already passes `searchQuery` to `getRestaurants()`

What is missing is the **bridge** that combines the two sources into one unified list, and the **fallback data strategy** for the restaurant detail screen when a Google-only place has no TastyPlates entry.

---

## 2. The Core Strategy — Hybrid Result Set

```
User opens Restaurants tab (or searches)
               │
               ▼
Query 1: getRestaurants() → TastyPlates DB (Nhost Function)
               │
               ▼ (parallel)
Query 2: getNearbyRestaurants() OR autocompletePlacesEstablishments()
         → Google Places API (client-side, location-biased)
               │
               ▼
Merge:   dedupe by google_place_id + name similarity
         TastyPlates rows: source = 'tp'
         Google-only rows: source = 'google' (no slug, no TP reviews)
               │
               ▼
Display: unified list — TP-linked rows appear first, Google rows below
         TP rows: full card (rating, reviews, cuisine pills, TP branding)
         Google rows: placeholder card (Google rating, address, "Not on TastyPlates")
               │
               ▼ Tap any card
         TP row → /restaurants/[slug] (existing detail screen)
         Google row → /restaurants/google/[place_id] (new hybrid detail screen)
```

---

## 3. Unified Result Type

```ts
// types/restaurantSearchResult.ts

/** A TastyPlates-sourced restaurant — has slug, reviews, TP ratings */
export interface TPRestaurantResult {
  source: 'tp'
  // All existing RestaurantListRow fields:
  id: number
  uuid: string
  slug: string
  title: string
  featured_image_url: string | null
  listing_street: string | null
  address: { city?: string; country_short?: string; street_address?: string } | null
  average_rating: number | null
  ratings_count: number | null
  cuisines: RestaurantListCuisine[]
  categories: RestaurantListCategory[]
  google_place_id?: string | null
  _distance?: number | null
}

/** A Google Places result with no TastyPlates match */
export interface GoogleRestaurantResult {
  source: 'google'
  place_id: string          // Google place_id — used as the route param
  title: string             // Google `name`
  featured_image_url: string | null  // built from photo_reference
  address: string | null    // Google `vicinity`
  google_rating: number | null
  google_review_count?: number | null
  latitude?: number | null
  longitude?: number | null
  types?: string[] | null
  // No slug, no uuid, no TP reviews
}

export type RestaurantSearchResult = TPRestaurantResult | GoogleRestaurantResult

// Type guards
export const isTPResult = (r: RestaurantSearchResult): r is TPRestaurantResult =>
  r.source === 'tp'
export const isGoogleResult = (r: RestaurantSearchResult): r is GoogleRestaurantResult =>
  r.source === 'google'
```

---

## 4. The Merge Function

```ts
// lib/restaurantSearchMerge.ts

import type { RestaurantListRow } from '@/services/restaurantsV2Service'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import {
  type RestaurantSearchResult,
  type TPRestaurantResult,
  type GoogleRestaurantResult,
} from '@/types/restaurantSearchResult'
import { googlePlacePhotoUrl } from '@/lib/googlePlaces'
import { normalizeCuisineList, normalizeCategoryList } from '@/services/restaurantsV2Service'

/**
 * Converts a TastyPlates DB row to a unified TPRestaurantResult.
 */
function toTPResult(row: RestaurantListRow): TPRestaurantResult {
  return {
    source: 'tp',
    id: row.id,
    uuid: row.uuid,
    slug: row.slug,
    title: row.title,
    featured_image_url: row.featured_image_url,
    listing_street: row.listing_street,
    address: row.address,
    average_rating: row.average_rating,
    ratings_count: row.ratings_count,
    cuisines: normalizeCuisineList(row.cuisines),
    categories: normalizeCategoryList(row.categories),
    google_place_id: null,
    _distance: row._distance ?? null,
  }
}

/**
 * Converts a Google Nearby/Autocomplete result to a unified GoogleRestaurantResult.
 * Never includes a slug — these are Google-only entries.
 */
function toGoogleResult(place: NearbyPlaceRow): GoogleRestaurantResult {
  return {
    source: 'google',
    place_id: place.place_id,
    title: place.name,
    featured_image_url: place.photo_reference
      ? googlePlacePhotoUrl(place.photo_reference, 560)
      : null,
    address: place.address,
    google_rating: place.google_rating ?? null,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    types: place.types ?? null,
  }
}

/**
 * Normalise a name for fuzzy deduplication (lowercase, remove punctuation, collapse spaces).
 */
function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Merge TastyPlates DB results with Google Places results.
 *
 * Rules:
 * 1. All TP rows are kept as-is (they have the most value).
 * 2. Google rows are added ONLY if no TP row shares the same normalised name
 *    (simple deduplication — avoids showing the same restaurant twice).
 * 3. TP rows appear first; Google rows appended below.
 * 4. Google rows are limited to `googleLimit` (default 10) to keep the list
 *    from being overwhelmed by Google data.
 *
 * When the DB has 0 results, Google rows fill the entire list.
 * When the DB has enough results (≥ threshold), Google rows may be suppressed.
 */
export function mergeRestaurantResults(
  tpRows: RestaurantListRow[],
  googlePlaces: NearbyPlaceRow[],
  options: {
    googleLimit?: number      // max Google rows to append (default 10)
    suppressGoogleWhenTPCount?: number  // suppress Google rows when TP has ≥ this many (default 20)
  } = {},
): RestaurantSearchResult[] {
  const { googleLimit = 10, suppressGoogleWhenTPCount = 20 } = options

  const merged: RestaurantSearchResult[] = tpRows.map(toTPResult)

  if (tpRows.length >= suppressGoogleWhenTPCount) {
    // DB has plenty — don't pollute with Google rows
    return merged
  }

  // Build a set of normalised names already in the TP list
  const tpNames = new Set(tpRows.map((r) => normName(r.title)))

  let googleAdded = 0
  for (const place of googlePlaces) {
    if (googleAdded >= googleLimit) break
    if (!place.place_id || !place.name) continue
    if (tpNames.has(normName(place.name))) continue  // duplicate — skip
    merged.push(toGoogleResult(place))
    googleAdded++
  }

  return merged
}
```

---

## 5. Updated Restaurants Screen (`index.tsx`)

```tsx
// app/(tabs)/restaurants/index.tsx — updated fetch logic only
// All existing imports remain. Add:
import { getNearbyRestaurants } from '@/lib/googlePlaces'
import { mergeRestaurantResults } from '@/lib/restaurantSearchMerge'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

// Replace rows state type:
const [rows, setRows] = useState<RestaurantSearchResult[]>([])

// Replace fetchFirstPage:
const fetchFirstPage = useCallback(async (options?: { isPullRefresh?: boolean }) => {
  const isPull = options?.isPullRefresh ?? false
  if (isPull) setRefreshing(true)
  else { setLoading(true); setCursor(null) }
  setError(null)

  try {
    // Both fetches fire in parallel
    const [tpData, googlePlaces] = await Promise.allSettled([
      getRestaurants({ search: searchQuery, palateSlugs, limit: PAGE_SIZE, cursor: null, locationKey }),
      // Only fetch Google nearby when idle (no search query) — for search queries,
      // use autocompletePlacesEstablishments instead (see §6 Search mode)
      searchQuery
        ? Promise.resolve([])
        : getNearbyRestaurants(location.coordinates, 2000),
    ])

    const tpRows = tpData.status === 'fulfilled' ? (tpData.value.restaurants ?? []) : []
    const googleRows = googlePlaces.status === 'fulfilled' ? googlePlaces.value : []

    if (tpData.status === 'fulfilled') {
      setCursor(tpData.value.meta.cursor)
      setHasMore(tpData.value.meta.hasMore)
    }

    const merged = mergeRestaurantResults(tpRows, googleRows, {
      googleLimit: 10,
      suppressGoogleWhenTPCount: 20,
    })
    setRows(merged)
  } catch (e) {
    if (!isPull) { setRows([]); setHasMore(false) }
    setError(e instanceof Error ? e.message : 'Failed to load restaurants')
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}, [searchQuery, palateSlugs, locationKey, location.coordinates])

// renderItem — handle both sources:
const renderItem = useCallback(
  ({ item }: { item: RestaurantSearchResult }) => {
    if (isTPResult(item)) {
      // Existing TP card — unchanged
      const overallRating = coerceRatingNumber(item.average_rating)
      return (
        <RestaurantBrowseCard
          title={item.title}
          slug={item.slug}
          imageUrl={item.featured_image_url}
          subtitle={formatRestaurantCardAddress(item.listing_street, item.address)}
          listingCategories={item.cuisines}
          categories={item.categories}
          rating={overallRating}
          reviewCount={item.ratings_count ?? undefined}
          containerStyle={cardWidth != null ? { width: cardWidth } : undefined}
          onPress={() => navigateToRestaurant(item.slug)}
          onCommentPress={() => navigateToRestaurant(item.slug)}
        />
      )
    }

    // Google-only card
    return (
      <GoogleRestaurantBrowseCard
        place={item}
        containerStyle={cardWidth != null ? { width: cardWidth } : undefined}
        onPress={() => router.push({
          pathname: '/restaurants/google/[place_id]',
          params: { place_id: item.place_id },
        })}
      />
    )
  },
  [cardWidth, navigateToRestaurant],
)

// keyExtractor — handle both sources:
keyExtractor={(item) =>
  isTPResult(item)
    ? (item.uuid ?? item.slug ?? String(item.id))
    : `google:${item.place_id}`
}
```

---

## 6. Search Mode — Autocomplete over Google + TP

When the user is actively typing a search query, replace the nearby call with `autocompletePlacesEstablishments()` and match each prediction against the TP DB:

```ts
// lib/hybridSearch.ts

import { autocompletePlacesEstablishments } from '@/lib/googlePlaces'
import { matchRestaurantFlexible } from '@/lib/findTastyPlatesMatch'
import { getRestaurants } from '@/services/restaurantsV2Service'
import type { LocationCoordinates } from '@/constants/locations'
import { mergeRestaurantResults } from '@/lib/restaurantSearchMerge'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'

/**
 * Hybrid search:
 * 1. Query TP DB with text search (existing Nhost Function)
 * 2. Query Google Autocomplete with same text (location-biased)
 * 3. For each Google prediction not already in TP results, try matchRestaurantFlexible()
 *    — if a match is found, promote it to a TP row with a link
 * 4. Merge and return unified list
 */
export async function hybridSearch(
  query: string,
  locationKey: string,
  coordinates: LocationCoordinates | null,
  limit = 24,
): Promise<RestaurantSearchResult[]> {
  const [tpResult, googlePredictions] = await Promise.allSettled([
    getRestaurants({ search: query, limit, locationKey }),
    autocompletePlacesEstablishments(query, coordinates),
  ])

  const tpRows = tpResult.status === 'fulfilled' ? tpResult.value.restaurants : []
  const tpSlugs = new Set(tpRows.map((r) => r.slug))

  // Convert autocomplete predictions to NearbyPlaceRow shape
  // then attempt TP match for each one not already found
  const googleCandidates: NearbyPlaceRow[] = []

  if (googlePredictions.status === 'fulfilled') {
    const predictions = googlePredictions.value.slice(0, 8)

    await Promise.all(
      predictions.map(async (pred) => {
        const name = pred.structured_formatting?.main_text ?? pred.description
        const address = pred.structured_formatting?.secondary_text ?? ''

        // Try to match against TP first
        const matches = await matchRestaurantFlexible({
          placeId: pred.place_id,
          name,
          address,
        })

        if (matches.length > 0 && !tpSlugs.has(matches[0].slug)) {
          // Promote: this Google place has a TP listing — treat as TP row
          // (the full row will appear when the main TP search runs or on next fetch)
          // For now, append as Google row — it will match on detail screen
        }

        googleCandidates.push({
          place_id: pred.place_id,
          name,
          address,
          latitude: null,
          longitude: null,
          photo_reference: null,
          google_rating: null,
          types: pred.types ?? null,
        })
      }),
    )
  }

  return mergeRestaurantResults(tpRows, googleCandidates, {
    googleLimit: 6,
    suppressGoogleWhenTPCount: 24,
  })
}
```

---

## 7. Google Restaurant Card Component

```tsx
// components/restaurant/GoogleRestaurantBrowseCard.tsx

import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import type { GoogleRestaurantResult } from '@/types/restaurantSearchResult'
import { BRAND_PRIMARY } from '@/constants/brand'

interface Props {
  place: GoogleRestaurantResult
  containerStyle?: object
  onPress: () => void
}

export function GoogleRestaurantBrowseCard({ place, containerStyle, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={containerStyle}
      className="overflow-hidden"
    >
      {/* Image — same aspect and radius as RestaurantBrowseCard */}
      <View className="relative rounded-2xl overflow-hidden bg-gray-100"
            style={{ aspectRatio: 4 / 3 }}>
        {place.featured_image_url ? (
          <Image
            source={{ uri: place.featured_image_url }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="restaurant-outline" size={40} color="#d1d5db" />
          </View>
        )}

        {/* "Not on TastyPlates" badge — top-left */}
        <View className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gray-900/70">
          <Text className="text-[10px] text-white font-medium">Google</Text>
        </View>
      </View>

      {/* Content */}
      <View className="pt-2 px-0.5">
        {/* Name + Google rating */}
        <View className="flex-row items-center justify-between">
          <Text className="font-neusans text-[15px] font-medium text-[#31343F] flex-1 mr-2"
                numberOfLines={1}>
            {place.title}
          </Text>
          {place.google_rating != null && (
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text className="font-neusans text-[13px] text-[#31343F]">
                {place.google_rating.toFixed(1)}
              </Text>
              <Text className="font-neusans text-[11px] text-[#6b7280]"> G</Text>
            </View>
          )}
        </View>

        {/* Address */}
        {place.address && (
          <Text className="font-neusans text-[12px] text-[#6b7280] mt-0.5" numberOfLines={1}>
            {place.address}
          </Text>
        )}

        {/* "Add a review" nudge */}
        <Text className="font-neusans text-[11px] mt-1" style={{ color: BRAND_PRIMARY }}>
          Be the first to review on TastyPlates →
        </Text>
      </View>
    </Pressable>
  )
}
```

---

## 8. Google Restaurant Detail Screen (`/restaurants/google/[place_id]`)

This is a new screen. It fetches full Google Place Details, checks for a TP match, and renders a unified detail view. It uses Google data as the primary source and TP data (if a match exists) as an enrichment layer.

```tsx
// app/(tabs)/restaurants/google/[place_id].tsx

import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchGooglePlaceDetails, googlePlacePhotoUrl } from '@/lib/googlePlaces'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import { matchRestaurantForPlace } from '@/lib/findTastyPlatesMatch'
import type { MatchedRestaurant } from '@/lib/findTastyPlatesMatch'
import { BRAND_PRIMARY } from '@/constants/brand'

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; place: PlacesDetailsResult; tpMatch: MatchedRestaurant | null }

export default function GooglePlaceDetailScreen() {
  const { place_id } = useLocalSearchParams<{ place_id: string }>()
  const [state, setState] = useState<ScreenState>({ status: 'loading' })

  const load = useCallback(async () => {
    if (!place_id) return
    setState({ status: 'loading' })
    try {
      // Both fetches in parallel
      const [placeDetails, tpMatch] = await Promise.allSettled([
        fetchGooglePlaceDetails(place_id),
        matchRestaurantForPlace({
          placeId: place_id,
          name: '',
          address: '',
        }),
      ])

      const place = placeDetails.status === 'fulfilled' ? placeDetails.value : null
      const match = tpMatch.status === 'fulfilled' ? tpMatch.value : null

      if (!place) {
        setState({ status: 'error', message: 'Restaurant not found' })
        return
      }

      setState({ status: 'ready', place, tpMatch: match })
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' })
    }
  }, [place_id])

  useEffect(() => { void load() }, [load])

  if (state.status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color={BRAND_PRIMARY} />
      </SafeAreaView>
    )
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-center text-sm text-gray-500">{state.message}</Text>
      </SafeAreaView>
    )
  }

  const { place, tpMatch } = state
  const heroPhoto = place.photos?.[0]?.photo_reference
    ? googlePlacePhotoUrl(place.photos[0].photo_reference, 800)
    : null

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>

      {/* Hero image */}
      <View style={{ height: 260, backgroundColor: '#f3f4f6' }}>
        {heroPhoto ? (
          <Image source={{ uri: heroPhoto }} style={{ width: '100%', height: '100%' }}
                 contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="restaurant-outline" size={64} color="#d1d5db" />
          </View>
        )}
      </View>

      <View className="px-4 pt-5">

        {/* ── TastyPlates match banner ── */}
        {tpMatch ? (
          <Pressable
            onPress={() => router.push(`/restaurants/${tpMatch.slug}`)}
            className="flex-row items-center gap-3 mb-4 p-3 rounded-2xl bg-orange-50 border border-orange-100"
          >
            <View className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: BRAND_PRIMARY }}>
              <Ionicons name="checkmark" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-neusans text-sm font-medium text-[#31343F]">
                This restaurant is on TastyPlates
              </Text>
              <Text className="font-neusans text-xs text-[#ff7c0a]">
                View {tpMatch.ratings_count ?? 0} reviews →
              </Text>
            </View>
          </Pressable>
        ) : (
          // ── No TP listing — invite to be first reviewer ──
          <View className="flex-row items-center gap-3 mb-4 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
              <Ionicons name="add" size={20} color="#9ca3af" />
            </View>
            <View className="flex-1">
              <Text className="font-neusans text-sm font-medium text-[#31343F]">
                Not on TastyPlates yet
              </Text>
              <Text className="font-neusans text-xs text-[#6b7280]">
                Be the first to add and review this restaurant
              </Text>
            </View>
            <Pressable
              onPress={() => router.push({
                pathname: '/studio/add-review',
                params: { prefill_place_id: place_id, prefill_name: place.name },
              })}
              className="px-3 py-1.5 rounded-full"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Text className="font-neusans text-xs text-white font-medium">Add</Text>
            </Pressable>
          </View>
        )}

        {/* Name */}
        <Text className="font-neusans text-2xl font-semibold text-[#31343F] mb-1">
          {place.name}
        </Text>

        {/* Address */}
        {(place.formatted_address ?? place.vicinity) && (
          <Text className="font-neusans text-sm text-[#6b7280] mb-3">
            {place.formatted_address ?? place.vicinity}
          </Text>
        )}

        {/* Google rating — clearly labelled as Google */}
        {place.rating != null && (
          <View className="flex-row items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-xl self-start">
            <Ionicons name="logo-google" size={16} color="#4285F4" />
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text className="font-neusans text-sm font-medium text-[#31343F]">
              {place.rating.toFixed(1)}
            </Text>
            {place.user_ratings_total != null && (
              <Text className="font-neusans text-xs text-[#6b7280]">
                ({place.user_ratings_total.toLocaleString()} Google reviews)
              </Text>
            )}
          </View>
        )}

        {/* TastyPlates rating — only if matched */}
        {tpMatch?.average_rating != null && (
          <View className="flex-row items-center gap-2 mb-4 px-3 py-2 rounded-xl self-start"
                style={{ backgroundColor: '#fef7f0' }}>
            <Ionicons name="star" size={14} color={BRAND_PRIMARY} />
            <Text className="font-neusans text-sm font-medium text-[#ff7c0a]">
              {tpMatch.average_rating.toFixed(1)} TastyPlates
            </Text>
            <Text className="font-neusans text-xs text-[#9ca3af]">
              ({tpMatch.ratings_count ?? 0} reviews)
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          <Pressable
            onPress={() => Linking.openURL(
              `https://www.google.com/maps/place/?q=place_id:${place_id}`
            )}
            className="flex-row items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-[50px]"
          >
            <Ionicons name="navigate-outline" size={16} color="#31343F" />
            <Text className="font-neusans text-sm text-[#31343F]">Directions</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push({
              pathname: '/studio/add-review',
              params: { prefill_place_id: place_id, prefill_name: place.name },
            })}
            className="flex-row items-center gap-2 px-4 py-2 rounded-[50px]"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Ionicons name="create-outline" size={16} color="white" />
            <Text className="font-neusans text-sm text-white">Write a Review</Text>
          </Pressable>
        </View>

        {/* TP Reviews preview — only if matched */}
        {tpMatch && (
          <Pressable
            onPress={() => router.push(`/restaurants/${tpMatch.slug}`)}
            className="w-full py-3 rounded-xl border border-gray-200 items-center mb-6"
          >
            <Text className="font-neusans text-sm font-medium text-[#31343F]">
              View all TastyPlates reviews →
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  )
}
```

---

## 9. Nhost Function — `restaurants-v2/match-restaurant`

This function already exists (called by `lib/findTastyPlatesMatch.ts`). Verify it supports `placeId` as a query field against `google_place_id`. If `google_place_id` is not yet indexed on the `restaurants` table, add the index:

```sql
-- Run once in Nhost Dashboard → SQL Editor
-- Already covered in tasty_studio_v1_migration.sql but confirm it exists:
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_place_id
  ON restaurants (google_place_id)
  WHERE google_place_id IS NOT NULL;
```

The match function should handle three strategies in order:

```ts
// functions/restaurants-v2/match-restaurant.ts — verify these three strategies exist:
// 1. Exact: WHERE google_place_id = $placeId (O(1) with index)
// 2. Fuzzy name: WHERE title ILIKE $name AND address->>'city' = $city
// 3. Coordinate: WHERE ST_Distance(geom, ST_Point($lng, $lat)) < 100m (if PostGIS enabled)
```

---

## 10. What Each Data Source Provides — The Fallback Matrix

| Field | TastyPlates DB | Google Places | Fallback strategy |
|-------|---------------|---------------|------------------|
| Restaurant name | ✅ `title` | ✅ `name` | Always from TP if linked |
| Address | ✅ `listing_street` + `address` | ✅ `formatted_address` / `vicinity` | TP preferred, Google fallback |
| Hero image | ✅ `featured_image_url` | ✅ from `photo_reference` | TP preferred, Google fallback |
| Rating value | ✅ TP community avg | ✅ Google avg | Show both, clearly labelled |
| Review count | ✅ TP `ratings_count` | ✅ `user_ratings_total` | Show both |
| Review text | ✅ Full TP reviews | ❌ Not accessible (Google ToS) | TP only — can't use Google review text |
| Cuisine tags | ✅ TP cuisine taxonomy | ⚠️ `types[]` (coarse) | TP preferred; map Google types as fallback |
| Opening hours | ✅ TP `opening_hours` | ⚠️ `opening_hours` (requires extra field) | Either source |
| Phone | ✅ TP `phone` | ⚠️ `formatted_phone_number` (extra field) | Either source |
| Palate score | ✅ TP palate system | ❌ None | TP only — the core differentiator |
| Price range | ✅ TP price range | ⚠️ `price_level` (0–4) | TP preferred |
| "Write a review" | ✅ Full review form | ✅ Redirects to TP (CTA to create listing) | Always TP — this is the value of the app |

> **The key insight:** Google review text is not available via the Places API (Terms of Service restriction). The only way to show review content is through TastyPlates. This is the core value proposition — show Google as a discovery mechanism, always funnel to TastyPlates for the review experience.

---

## 11. The "Add to TastyPlates" CTA — Closing the Loop

Every Google-only result in the list and on the detail screen has a clear CTA to write the first TastyPlates review. This is the growth loop:

```
User discovers restaurant via Google (new city, empty DB)
  → Sees "Be the first to review on TastyPlates →"
  → Taps → /studio/add-review with place_id and name pre-filled
  → Writes review → restaurant is now in TastyPlates DB
  → Next user sees it in the TP results (not Google fallback)
```

Pre-fill the add-review search with the Google place data so the user doesn't have to search again:

```tsx
// In add-review/index.tsx — handle prefill params
const { prefill_place_id, prefill_name } = useLocalSearchParams<{
  prefill_place_id?: string
  prefill_name?: string
}>()

useEffect(() => {
  if (prefill_place_id && prefill_name) {
    // Skip the search step — go straight to the match/create flow
    handlePlaceSelect(prefill_place_id, prefill_name)
  }
}, [])
```

---

## 12. Map View — Restaurants Screen with Bottom Sheet List

### 12.1 Installation and `app.json` setup

`react-native-maps` is not yet in the project. Add it before anything else:

```bash
npx expo install react-native-maps
```

Then update `app.json` to register the Google Maps plugin and supply the API key for both platforms:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      "expo-secure-store",
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-logo.png",
          "resizeMode": "contain",
          "backgroundColor": "#31343F",
          "imageWidth": 200
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.toyama.rodrigo.expo-router-template",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "CFBundleDisplayName": "TastyPlates",
        "NSLocationWhenInUseUsageDescription": "TastyPlates uses your location to show nearby restaurants."
      }
    },
    "android": {
      "package": "com.toyama.rodrigo.exporoutertemplate",
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

> `react-native-maps` requires a new EAS build after `app.json` changes — `npx expo run:android` / `npx expo run:ios` will not pick up the native module without a clean build.

---

### 12.2 Screen layout — map fills the screen, list lives in a bottom sheet

The Restaurants screen replaces the full-page `FlatList` with a two-layer layout:

```
┌───────────────────────────────────────┐  ← SafeAreaView flex-1
│  AppTopNav (fixed)                    │
│  PalateFilterChips (fixed, below nav) │
│───────────────────────────────────────│
│                                       │
│   MapView (fills remaining space)     │  ← react-native-maps MapView
│                                       │     flex-1, initialRegion from
│   [●] [●] [●]  map pins               │     location.coordinates
│       ↑                               │
│   selected pin: larger, #ff7c0a       │
│                                       │
│───────────────────────────────────────│
│  Bottom sheet (Reanimated 4 drag)     │
│                                       │
│  ┌─ Peek state (240px from bottom) ─┐ │
│  │  drag handle pill                │ │
│  │  "32 restaurants near Toronto"   │ │
│  │  ─────────────────────────────   │ │
│  │  [RestaurantListRow]  (1 card)   │ │  ← first card peeks above fold
│  └──────────────────────────────────┘ │
│                                       │
│  ┌─ Expanded state (80% of screen) ─┐ │
│  │  drag handle pill                │ │
│  │  "32 restaurants near Toronto"   │ │
│  │  ─────────────────────────────   │ │
│  │  [RestaurantListRow]             │ │
│  │  [RestaurantListRow]  ← scroll   │ │
│  │  [RestaurantListRow]             │ │
│  │  ...                             │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**Two snap points:**
- `PEEK` = `SCREEN_HEIGHT * 0.32` — bottom sheet rests here by default, showing the handle + count + 1 card peeking
- `EXPANDED` = `SCREEN_HEIGHT * 0.80` — swiped up, full scrollable list

---

### 12.3 Map pin design

Each restaurant result renders as a `MapView.Marker`. TP results and Google results share the same pin shape but differ in colour:

| Source | Pin colour | Size |
|--------|-----------|------|
| TP result (normal) | `#ff7c0a` | 36×36 |
| TP result (selected) | `#31343F` + white border | 44×44 |
| Google result (normal) | `#9ca3af` | 32×32 |
| Google result (selected) | `#6b7280` + white border | 40×40 |

Custom marker using a `View` child (avoids the default red balloon):

```tsx
// components/restaurant/RestaurantMapPin.tsx

import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface RestaurantMapPinProps {
  isSelected: boolean
  isGoogle: boolean
  rating?: number | null
}

export function RestaurantMapPin({ isSelected, isGoogle, rating }: RestaurantMapPinProps) {
  const bg = isGoogle
    ? (isSelected ? '#6b7280' : '#9ca3af')
    : (isSelected ? '#31343F' : '#ff7c0a')
  const size = isSelected ? (isGoogle ? 40 : 44) : (isGoogle ? 32 : 36)

  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: isSelected ? 2.5 : 0,
        borderColor: 'white',
        alignItems: 'center', justifyContent: 'center',
        // Drop shadow so pins are visible over map tiles
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      {rating != null ? (
        <Text style={{ color: 'white', fontSize: isSelected ? 11 : 9, fontFamily: 'Neusans', fontWeight: '600' }}>
          {rating.toFixed(1)}
        </Text>
      ) : (
        <Ionicons name="restaurant" size={isSelected ? 18 : 14} color="white" />
      )}
    </View>
  )
}
```

---

### 12.4 Full screen replacement (`app/(tabs)/restaurants/index.tsx`)

This replaces the current `FlatList` layout entirely. The existing data fetching logic (`fetchFirstPage`, `loadMore`, `mergeRestaurantResults`) is unchanged — only the render layer changes.

```tsx
// app/(tabs)/restaurants/index.tsx — full rewrite of the render section

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions, FlatList, Pressable, RefreshControl,
  Text, View,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, interpolate, Extrapolation,
  useAnimatedGestureHandler, runOnJS,
} from 'react-native-reanimated'
import { PanGestureHandler } from 'react-native-gesture-handler'
import MapView, { Marker, type Region } from 'react-native-maps'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { PalateFilterChips } from '@/components/search/PalateFilterChips'
import { RestaurantMapPin } from '@/components/restaurant/RestaurantMapPin'
import { RestaurantListRow as RestaurantListRowComponent } from '@/components/restaurant/RestaurantListRow'
import { RestaurantListSkeletonList } from '@/components/ui/Skeleton/RestaurantListSkeleton'
import { useLocation } from '@/contexts/LocationContext'
import { isNoPalateFilter } from '@/lib/palateSearch'
import { mergeRestaurantResults } from '@/lib/restaurantSearchMerge'
import { getNearbyRestaurants } from '@/lib/googlePlaces'
import { getRestaurants } from '@/services/restaurantsV2Service'
import { isTPResult, isGoogleResult } from '@/types/restaurantSearchResult'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { BRAND_PRIMARY } from '@/constants/brand'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')
const PEEK    = SCREEN_HEIGHT * 0.32   // bottom sheet rests here
const EXPANDED = SCREEN_HEIGHT * 0.80  // fully expanded
const PAGE_SIZE = 24

export default function RestaurantsScreen() {
  const { location } = useLocation()
  const locationKey = location.key
  const coordinates = location.coordinates ?? null

  const raw = useLocalSearchParams<{ palate?: string; search?: string; listing?: string }>()
  const palate = typeof raw.palate === 'string' ? raw.palate : undefined
  const searchQuery = useMemo(() => {
    const a = typeof raw.search === 'string' ? raw.search.trim() : ''
    const b = typeof raw.listing === 'string' ? raw.listing.trim() : ''
    return (a && b ? `${a} ${b}` : a || b) || undefined
  }, [raw.search, raw.listing])
  const palateSlugs = useMemo(() => (palate ? [palate] : undefined), [palate])

  // ── Data ───────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<RestaurantSearchResult[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchFirstPage = useCallback(async (opts?: { isPullRefresh?: boolean }) => {
    const isPull = opts?.isPullRefresh ?? false
    if (isPull) setRefreshing(true)
    else { setLoading(true); setCursor(null) }

    const [tpResult, googleResult] = await Promise.allSettled([
      getRestaurants({ search: searchQuery, palateSlugs, limit: PAGE_SIZE, cursor: null, locationKey }),
      searchQuery ? Promise.resolve([]) : getNearbyRestaurants(coordinates, 2000),
    ])

    const tpRows  = tpResult.status  === 'fulfilled' ? (tpResult.value.restaurants  ?? []) : []
    const gRows   = googleResult.status === 'fulfilled' ? googleResult.value : []

    if (tpResult.status === 'fulfilled') {
      setCursor(tpResult.value.meta.cursor)
      setHasMore(tpResult.value.meta.hasMore)
    }

    setRows(mergeRestaurantResults(tpRows, gRows, {
      googleLimit: 10,
      suppressGoogleWhenTPCount: 20,
      palateSlug: palate ?? null,
    }))
    setLoading(false)
    setRefreshing(false)
  }, [searchQuery, palateSlugs, locationKey, coordinates, palate])

  useEffect(() => { void fetchFirstPage() }, [fetchFirstPage])

  // ── Map state ──────────────────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const initialRegion: Region | undefined = coordinates
    ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }
    : undefined

  // Fit map to show all markers when rows load
  useEffect(() => {
    if (!mapRef.current || rows.length === 0) return
    const coords = rows
      .map(r => ({
        latitude:  isTPResult(r) ? (r.latitude  ?? null) : (r.latitude  ?? null),
        longitude: isTPResult(r) ? (r.longitude ?? null) : (r.longitude ?? null),
      }))
      .filter((c): c is { latitude: number; longitude: number } =>
        c.latitude != null && c.longitude != null
      )
    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: PEEK + 40, left: 40 },
        animated: true,
      })
    }
  }, [rows])

  // ── Bottom sheet (Reanimated 4 drag) ──────────────────────────────────────
  const translateY = useSharedValue(0)      // 0 = PEEK position (at rest)
  const listRef    = useRef<FlatList>(null)

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  // Convert drag to snap
  const snapToPosition = useCallback((targetY: number) => {
    translateY.value = withSpring(targetY, { mass: 0.6, damping: 20, stiffness: 180 })
  }, [translateY])

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: { startY: number }) => {
      ctx.startY = translateY.value
    },
    onActive: (event, ctx) => {
      // Clamp: can't drag below 0 (PEEK) or above -(EXPANDED - PEEK)
      const next = ctx.startY + event.translationY
      translateY.value = Math.max(-(EXPANDED - PEEK), Math.min(0, next))
    },
    onEnd: (event) => {
      const velocity = event.velocityY
      const current  = translateY.value
      const midpoint = -(EXPANDED - PEEK) / 2

      // Fast swipe up → expand; fast swipe down → peek; else snap to nearest
      if (velocity < -500 || (velocity >= 0 && current < midpoint)) {
        runOnJS(snapToPosition)(-(EXPANDED - PEEK))
      } else {
        runOnJS(snapToPosition)(0)
      }
    },
  })

  // ── Pin tap → scroll to card ───────────────────────────────────────────────
  const handlePinPress = useCallback((id: string, index: number) => {
    void Haptics.selectionAsync()
    setSelectedId(id)
    // Expand the sheet so the card is visible
    snapToPosition(-(EXPANDED - PEEK))
    // Scroll FlatList to the tapped card
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 })
    }, 300)  // after sheet expand animation starts
  }, [snapToPosition])

  // ── List row press ─────────────────────────────────────────────────────────
  const navigateToRestaurant = useCallback((result: RestaurantSearchResult) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isTPResult(result)) {
      router.push({ pathname: '/restaurants/[slug]', params: { slug: result.slug, palate: palate ?? '' } })
    } else {
      router.push({ pathname: '/restaurants/google/[place_id]', params: { place_id: result.place_id } })
    }
  }, [palate])

  // ── Helpers for marker identity ────────────────────────────────────────────
  const resultId = (r: RestaurantSearchResult): string =>
    isTPResult(r) ? (r.uuid ?? r.slug) : `google:${r.place_id}`

  const resultCoords = (r: RestaurantSearchResult) =>
    isTPResult(r)
      ? { latitude: r.latitude ?? null, longitude: r.longitude ?? null }
      : { latitude: r.latitude ?? null, longitude: r.longitude ?? null }

  const resultRating = (r: RestaurantSearchResult) =>
    isTPResult(r) ? r.average_rating : r.google_rating

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <AppTopNav />

      {/* Active filter chips — fixed below nav */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <PalateFilterChips
          palate={palate}
          searchQuery={searchQuery}
          onClearPalate={() => router.setParams({ palate: undefined })}
          onClearSearch={() => router.setParams({ search: undefined, listing: undefined })}
        />
      </View>

      {/* MapView — fills the screen behind the bottom sheet */}
      {initialRegion ? (
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {rows.map((result, index) => {
            const id     = resultId(result)
            const coords = resultCoords(result)
            if (!coords.latitude || !coords.longitude) return null
            const isSelected = selectedId === id

            return (
              <Marker
                key={id}
                coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
                onPress={() => handlePinPress(id, index)}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={isSelected ? 2 : 1}
              >
                <RestaurantMapPin
                  isSelected={isSelected}
                  isGoogle={isGoogleResult(result)}
                  rating={resultRating(result)}
                />
              </Marker>
            )
          })}
        </MapView>
      ) : (
        // No coordinates — fall back to full-page list
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {loading ? (
            <RestaurantListSkeletonList count={8} />
          ) : (
            <FlatList
              ref={listRef}
              data={rows}
              keyExtractor={(r) => resultId(r)}
              renderItem={({ item }) => (
                <RestaurantListRow result={item} onPress={() => navigateToRestaurant(item)} />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
              refreshControl={<RefreshControl refreshing={refreshing}
                onRefresh={() => void fetchFirstPage({ isPullRefresh: true })}
                tintColor={BRAND_PRIMARY} />}
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={0.35}
              contentContainerStyle={{ paddingBottom: 32 }}
            />
          )}
        </View>
      )}

      {/* Bottom sheet — Reanimated drag */}
      {initialRegion && (
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                // Sheet starts at PEEK height, expands up by (EXPANDED - PEEK)
                height: EXPANDED,
                // Initial translateY = 0 means bottom of sheet aligns with bottom of screen
                // minus PEEK visible area
                top: SCREEN_HEIGHT - PEEK,
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 12,
              },
              sheetStyle,
            ]}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 }} />
            </View>

            {/* Result count header */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <Text style={{ fontFamily: 'Neusans', fontSize: 15, fontWeight: '600', color: '#31343F' }}>
                {loading
                  ? 'Loading restaurants…'
                  : `${rows.length}${hasMore ? '+' : ''} restaurants near ${location.label}`
                }
              </Text>
              {!isNoPalateFilter(palate) && (
                <Text style={{ fontFamily: 'Neusans', fontSize: 12, color: '#ff7c0a', marginTop: 2 }}>
                  Sorted by palate match
                </Text>
              )}
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#f3f4f6', marginBottom: 4 }} />

            {/* Scrollable restaurant list */}
            {loading && rows.length === 0 ? (
              <RestaurantListSkeletonList count={5} />
            ) : (
              <FlatList
                ref={listRef}
                data={rows}
                keyExtractor={(r) => resultId(r)}
                renderItem={({ item, index }) => (
                  <RestaurantListRow
                    result={item}
                    isSelected={selectedId === resultId(item)}
                    onPress={() => {
                      setSelectedId(resultId(item))
                      navigateToRestaurant(item)
                    }}
                  />
                )}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 }} />
                )}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void fetchFirstPage({ isPullRefresh: true })}
                    tintColor={BRAND_PRIMARY}
                  />
                }
                onEndReached={() => void loadMore()}
                onEndReachedThreshold={0.35}
                contentContainerStyle={{ paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  !loading ? (
                    <View style={{ paddingTop: 32, paddingHorizontal: 24 }}>
                      <Text style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', fontFamily: 'Neusans' }}>
                        No restaurants found near this area.{'\n'}Try adjusting your palate filter.
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </Animated.View>
        </PanGestureHandler>
      )}
    </View>
  )
}
```

---

### 12.5 `RestaurantListRow` — the list item inside the bottom sheet

The bottom sheet uses a **list row** layout (not the existing card grid) because horizontal card grids do not make sense in a narrow bottom sheet. This is a new component that matches the Spotify-standard row from `my_lists.md`:

```tsx
// components/restaurant/RestaurantListRow.tsx

import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isTPResult, isGoogleResult } from '@/types/restaurantSearchResult'
import { BRAND_PRIMARY } from '@/constants/brand'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'

interface Props {
  result: RestaurantSearchResult
  isSelected?: boolean
  onPress: () => void
}

export function RestaurantListRow({ result, isSelected = false, onPress }: Props) {
  const title = isTPResult(result) ? result.title : result.title
  const imageUrl = isTPResult(result)
    ? (result.featured_image_url ?? DEFAULT_IMAGE)
    : (result.featured_image_url ?? DEFAULT_IMAGE)
  const address = isTPResult(result)
    ? ([result.listing_street, result.address?.city].filter(Boolean).join(', ') || null)
    : result.address
  const rating    = isTPResult(result) ? result.average_rating : result.google_rating
  const isGoogle  = isGoogleResult(result)
  const cuisines  = isTPResult(result) ? (result.cuisines ?? []).slice(0, 2) : []

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        gap: 12,
        backgroundColor: isSelected ? '#fef7f0' : 'transparent',
      }}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 56, height: 56, borderRadius: 10 }}
        contentFit="cover"
      />

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={{ fontFamily: 'Neusans', fontSize: 15, fontWeight: '500', color: '#31343F', flex: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {isGoogle && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f3f4f6', borderRadius: 50 }}>
              <Text style={{ fontFamily: 'Neusans', fontSize: 9, color: '#9ca3af' }}>Google</Text>
            </View>
          )}
        </View>

        {address && (
          <Text style={{ fontFamily: 'Neusans', fontSize: 12, color: '#6b7280' }} numberOfLines={1}>
            {address}
          </Text>
        )}

        {/* Cuisine pills (TP only) */}
        {cuisines.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
            {cuisines.map(c => (
              <View key={c.slug} style={{ backgroundColor: '#ff7c0a', borderRadius: 50, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontFamily: 'Neusans', fontSize: 9, color: 'white' }}>{c.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Rating */}
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {rating != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="star" size={12} color={isGoogle ? '#f59e0b' : BRAND_PRIMARY} />
            <Text style={{ fontFamily: 'Neusans', fontSize: 13, color: '#31343F' }}>
              {rating.toFixed(1)}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color="#e5e7eb" />
      </View>
    </Pressable>
  )
}
```

---

### 12.6 Pin tap → list scroll coordination

When the user taps a map pin:

1. `handlePinPress(id, index)` fires with the result's ID and its index in the `rows` array
2. `setSelectedId(id)` highlights the pin (larger, dark colour) and the corresponding list row (orange tint background)
3. `snapToPosition(-(EXPANDED - PEEK))` springs the sheet upward to the expanded position
4. After a 300ms delay (sheet spring in progress), `listRef.current?.scrollToIndex({ index, animated: true, viewOffset: 12 })` scrolls the `FlatList` inside the sheet to bring that card into view

When the user scrolls the list and taps a row:

1. `setSelectedId(resultId(item))` highlights the corresponding pin on the map
2. `mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400)` pans the map to centre on that restaurant

```tsx
// Add to navigateToRestaurant or to the row's onPress:
const handleRowPress = useCallback((result: RestaurantSearchResult, index: number) => {
  const id = resultId(result)
  setSelectedId(id)

  // Pan map to selected restaurant
  const coords = resultCoords(result)
  if (coords.latitude && coords.longitude && mapRef.current) {
    mapRef.current.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      400,
    )
  }

  navigateToRestaurant(result)
}, [navigateToRestaurant])
```

---

### 12.7 Palate interaction with the map

The palate filter works identically to the list-only view. When `?palate=korean` is active:

- `getRestaurants()` still passes `palate_slugs=korean` to filter TP rows server-side
- `mergeRestaurantResults()` suppresses Google rows (the `palateSlug` guard from §13 of the palate interaction answer)
- Only TP restaurants with Korean palate reviews appear as pins
- The bottom sheet count reads `"N restaurants near Toronto"` with the orange sub-label `"Sorted by palate match"`
- The map `fitToCoordinates()` call automatically fits the visible region to only the palate-filtered pins — the map zooms into the neighbourhood where Korean restaurants actually cluster

When `?palate=` is cleared, the full merged set (TP + Google nearby) reappears.

---

### 12.8 Fallback — no coordinates for location

Some `SavedLocationPreference` entries may have no `coordinates`. In that case `initialRegion` is `undefined` and the map cannot be shown. The screen gracefully falls back to the existing full-page `FlatList` layout with no bottom sheet — the condition is `{initialRegion ? <MapView ... /> : <FlatList ... />}` as shown in §12.4.

---

## 13. Updated Summary — What to Build, in Order

| Priority | Change | File(s) |
|----------|--------|---------|
| 1 | Add `RestaurantSearchResult` union type and type guards | `types/restaurantSearchResult.ts` (new) |
| 2 | Add `mergeRestaurantResults()` with `palateSlug` guard | `lib/restaurantSearchMerge.ts` (new) |
| 3 | Install `react-native-maps` + update `app.json` | `package.json`, `app.json` |
| 4 | Add `RestaurantMapPin` component | `components/restaurant/RestaurantMapPin.tsx` (new) |
| 5 | Add `RestaurantListRow` component (bottom sheet row) | `components/restaurant/RestaurantListRow.tsx` (new) |
| 6 | Rewrite `RestaurantsScreen` with map + bottom sheet | `app/(tabs)/restaurants/index.tsx` |
| 7 | Add `GoogleRestaurantBrowseCard` (Google Place card for map-less fallback) | `components/restaurant/GoogleRestaurantBrowseCard.tsx` (new) |
| 8 | Add Google Place detail screen | `app/(tabs)/restaurants/google/[place_id].tsx` (new) |
| 9 | Handle `prefill_place_id` in add-review | `app/(tabs)/studio/add-review/index.tsx` |
| 10 | Add `hybridSearch()` for text search mode | `lib/hybridSearch.ts` (new) |
| 11 | Confirm `google_place_id` index on `restaurants` table | Nhost Dashboard SQL Editor |