import type { LocationCoordinates } from '@/constants/locations'
import { geoQueryFromCityCenter, isWithinRadiusKm, CITY_SEARCH_RADIUS_KM } from '@/lib/geoUtils'
import {
  autocompletePlacesEstablishments,
  fetchGooglePlaceDetails,
  getNearbyRestaurants,
} from '@/lib/googlePlaces'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { mergeRestaurantResults } from '@/lib/restaurantSearchMerge'
import { splitDiscoveryResults } from '@/lib/restaurantDiscoveryHelpers'
import {
  limitForHybridSearchMode,
  MERGE_GOOGLE_LIMIT_IDLE,
  MERGE_GOOGLE_LIMIT_SEARCH,
  MERGE_SUPPRESS_TP_COUNT_IDLE,
  MERGE_SUPPRESS_TP_COUNT_SEARCH,
  NEARBY_PICKER_RADIUS_METERS,
  type HybridSearchGeoMode,
  type HybridSearchMode,
} from '@/lib/restaurantSearchConfig'
import { getRestaurants } from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult } from '@/types/restaurantSearchResult'

const GASTRONOMY_TYPES = ['restaurant', 'food', 'meal', 'cafe', 'bakery', 'bar']
const AUTOCOMPLETE_CAP = 8

function gastronomyScore(types: string[] | undefined): number {
  if (!types?.length) return 0
  let v = 0
  if (types.some((x) => x.includes('restaurant'))) v += 3
  if (types.some((x) => GASTRONOMY_TYPES.some((k) => k !== 'restaurant' && x.includes(k)))) v += 2
  if (types.some((x) => x.includes('establishment'))) v += 1
  return v
}

function filterEstablishmentPredictions(
  rows: Awaited<ReturnType<typeof autocompletePlacesEstablishments>>,
): Awaited<ReturnType<typeof autocompletePlacesEstablishments>> {
  const filtered = rows.filter((p) => {
    const types = p.types ?? []
    if (types.length === 0) return true
    return types.some((t) => GASTRONOMY_TYPES.some((k) => t.includes(k)))
  })
  return filtered.sort((a, b) => gastronomyScore(b.types) - gastronomyScore(a.types))
}

function predictionsToCandidates(
  predictions: Awaited<ReturnType<typeof autocompletePlacesEstablishments>>,
): NearbyPlaceRow[] {
  const googleCandidates: NearbyPlaceRow[] = []

  for (const pred of filterEstablishmentPredictions(predictions).slice(0, AUTOCOMPLETE_CAP)) {
    const name = pred.structured_formatting?.main_text ?? pred.description
    const address = pred.structured_formatting?.secondary_text ?? ''

    if (googleCandidates.some((g) => g.place_id === pred.place_id)) continue

    googleCandidates.push({
      place_id: pred.place_id,
      name,
      address: address || null,
      latitude: null,
      longitude: null,
      photo_reference: null,
      google_rating: null,
      types: pred.types ?? null,
    })
  }

  return googleCandidates
}

async function enrichGoogleCandidatesWithDetails(
  candidates: NearbyPlaceRow[],
  coordinates: LocationCoordinates | null,
  maxEnrich: number,
  signal?: AbortSignal,
): Promise<NearbyPlaceRow[]> {
  if (candidates.length === 0 || maxEnrich <= 0) return candidates

  const toEnrich = candidates.slice(0, maxEnrich)
  const enriched = await Promise.allSettled(
    toEnrich.map(async (candidate) => {
      const details = await fetchGooglePlaceDetails(candidate.place_id, signal)
      if (!details) return candidate

      const lat = details.geometry?.location?.lat ?? null
      const lng = details.geometry?.location?.lng ?? null

      if (
        coordinates &&
        lat != null &&
        lng != null &&
        !isWithinRadiusKm(coordinates, lat, lng, CITY_SEARCH_RADIUS_KM)
      ) {
        return candidate
      }

      return {
        ...candidate,
        latitude: lat,
        longitude: lng,
        google_rating: details.rating ?? candidate.google_rating ?? null,
        photo_reference: details.photos?.[0]?.photo_reference ?? candidate.photo_reference,
        address:
          details.formatted_address ??
          details.vicinity ??
          candidate.address,
        types: details.types ?? candidate.types,
      } satisfies NearbyPlaceRow
    }),
  )

  if (signal?.aborted) return candidates

  const enrichedByPlaceId = new Map<string, NearbyPlaceRow>()
  toEnrich.forEach((candidate, index) => {
    const result = enriched[index]
    if (result.status === 'fulfilled' && result.value) {
      enrichedByPlaceId.set(candidate.place_id, result.value)
    }
  })

  return candidates.map((c) => enrichedByPlaceId.get(c.place_id) ?? c)
}

function tpGeoParams(
  coordinates: LocationCoordinates | null,
  geoMode: HybridSearchGeoMode,
  hasTextQuery: boolean,
): {
  latitude?: number
  longitude?: number
  radiusKm?: number
} {
  if (geoMode === 'off' || hasTextQuery) return {}
  return geoQueryFromCityCenter(coordinates)
}

function errorFromReason(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  return 'Request failed'
}

export interface HybridSearchOptions {
  /** @deprecated Palate Sort uses `palateSlug` for sort context only — not sent as `palate_slugs` filter. */
  palateSlugs?: string[]
  /** Filter TP rows by cuisine slug(s) — maps to Hasura `cuisine_slugs`. */
  cuisineSlugs?: string[]
  limit?: number
  mode?: HybridSearchMode
  geoMode?: HybridSearchGeoMode
  cityName?: string
  /** When set, enables Palate Sort base order (`smart`) and suppresses Google merge. */
  palateSlug?: string | null
  signal?: AbortSignal
}

export interface HybridSearchResponse {
  results: RestaurantSearchResult[]
  tpResults: RestaurantSearchResult[]
  googleResults: RestaurantSearchResult[]
  cursor: string | null
  hasMore: boolean
  errors: {
    tp?: string
    google?: string
  }
}

/**
 * Hybrid text search: TP DB + Google Autocomplete, merged and deduped.
 */
export async function hybridSearch(
  query: string,
  locationKey: string,
  coordinates: LocationCoordinates | null,
  options: HybridSearchOptions = {},
): Promise<HybridSearchResponse> {
  const mode = options.mode ?? 'browse'
  const limit = options.limit ?? limitForHybridSearchMode(mode)
  const trimmed = query.trim()
  const hasTextQuery = trimmed.length >= 2
  const geoMode = options.geoMode ?? (hasTextQuery ? 'off' : 'filter')
  const geo = tpGeoParams(coordinates, geoMode, hasTextQuery)
  const signal = options.signal
  const errors: HybridSearchResponse['errors'] = {}

  const palateSortActive = Boolean(options.palateSlug?.trim())

  const [tpResult, googlePredictions] = await Promise.allSettled([
    hasTextQuery
      ? getRestaurants({
          search: trimmed,
          limit,
          locationKey,
          cityName: options.cityName,
          order_by: palateSortActive ? 'smart' : undefined,
          cuisineSlugs: options.cuisineSlugs,
          ...geo,
        })
      : Promise.resolve({ restaurants: [], meta: { cursor: null, hasMore: false } }),
    hasTextQuery ? autocompletePlacesEstablishments(trimmed, coordinates) : Promise.resolve([]),
  ])

  if (signal?.aborted) {
    return {
      results: [],
      tpResults: [],
      googleResults: [],
      cursor: null,
      hasMore: false,
      errors,
    }
  }

  if (tpResult.status === 'rejected') {
    errors.tp = errorFromReason(tpResult.reason)
  }
  if (googlePredictions.status === 'rejected') {
    errors.google = errorFromReason(googlePredictions.reason)
  }

  const tpRows = tpResult.status === 'fulfilled' ? tpResult.value.restaurants : []
  const cursor =
    tpResult.status === 'fulfilled' ? (tpResult.value.meta?.cursor ?? null) : null
  const hasMore =
    tpResult.status === 'fulfilled' ? (tpResult.value.meta?.hasMore ?? false) : false

  let googleCandidates: NearbyPlaceRow[] = []

  if (googlePredictions.status === 'fulfilled') {
    googleCandidates = predictionsToCandidates(googlePredictions.value)
  }

  const palateSlug = options.palateSlug ?? null
  const suppressGoogle =
    Boolean(palateSlug?.trim()) || tpRows.length >= MERGE_SUPPRESS_TP_COUNT_SEARCH

  if (!suppressGoogle && googleCandidates.length > 0) {
    googleCandidates = await enrichGoogleCandidatesWithDetails(
      googleCandidates,
      coordinates,
      MERGE_GOOGLE_LIMIT_SEARCH,
      signal,
    )
  }

  if (signal?.aborted) {
    return {
      results: [],
      tpResults: [],
      googleResults: [],
      cursor: null,
      hasMore: false,
      errors,
    }
  }

  const results = mergeRestaurantResults(tpRows, googleCandidates, {
    googleLimit: MERGE_GOOGLE_LIMIT_SEARCH,
    suppressGoogleWhenTPCount: MERGE_SUPPRESS_TP_COUNT_SEARCH,
    palateSlug,
  })

  const { tpResults, googleResults } = splitDiscoveryResults(results)

  return { results, tpResults, googleResults, cursor, hasMore, errors }
}

export async function previewHybridSearch(
  query: string,
  locationKey: string,
  coordinates: LocationCoordinates | null,
  options: Omit<HybridSearchOptions, 'mode' | 'limit'> = {},
): Promise<HybridSearchResponse> {
  return hybridSearch(query, locationKey, coordinates, { ...options, mode: 'preview' })
}

export async function listPickerHybridSearch(
  query: string,
  locationKey: string,
  coordinates: LocationCoordinates | null,
  options: Omit<HybridSearchOptions, 'mode' | 'limit' | 'geoMode'> = {},
): Promise<HybridSearchResponse> {
  return hybridSearch(query, locationKey, coordinates, {
    ...options,
    mode: 'listPicker',
    geoMode: 'off',
  })
}

export interface NearbyHybridDiscoveryOptions {
  cuisineSlugs?: string[]
  /** Optional Google Nearby Search keyword (e.g. cuisine label). */
  googleKeyword?: string | null
  signal?: AbortSignal
}

export interface NearbyHybridDiscoveryResponse {
  tpResults: RestaurantSearchResult[]
  googlePlaces: NearbyPlaceRow[]
  errors: HybridSearchResponse['errors']
}

/** Idle hybrid nearby — TP geo list + Google Nearby, optionally cuisine-filtered. */
export async function nearbyHybridDiscovery(
  locationKey: string,
  coordinates: LocationCoordinates | null,
  options: NearbyHybridDiscoveryOptions = {},
): Promise<NearbyHybridDiscoveryResponse> {
  const signal = options.signal
  const errors: NearbyHybridDiscoveryResponse['errors'] = {}
  const geo = geoQueryFromCityCenter(coordinates)

  const [tpResult, googleResult] = await Promise.allSettled([
    getRestaurants({
      limit: limitForHybridSearchMode('listPicker'),
      locationKey,
      cuisineSlugs: options.cuisineSlugs,
      ...geo,
    }),
    coordinates
      ? getNearbyRestaurants(
          coordinates,
          NEARBY_PICKER_RADIUS_METERS,
          options.googleKeyword ?? null,
        )
      : Promise.resolve([]),
  ])

  if (tpResult.status === 'rejected') {
    errors.tp = errorFromReason(tpResult.reason)
  }
  if (googleResult.status === 'rejected') {
    errors.google = errorFromReason(googleResult.reason)
  }

  const tpRows = tpResult.status === 'fulfilled' ? tpResult.value.restaurants : []
  const googleRows = googleResult.status === 'fulfilled' ? googleResult.value : []

  const merged = mergeRestaurantResults(tpRows, googleRows, {
    googleLimit: MERGE_GOOGLE_LIMIT_IDLE,
    suppressGoogleWhenTPCount: MERGE_SUPPRESS_TP_COUNT_IDLE,
  })

  const { tpResults, googleResults } = splitDiscoveryResults(merged)

  if (signal?.aborted) {
    return { tpResults: [], googlePlaces: [], errors }
  }

  const shownGooglePlaceIds = new Set(
    googleResults.filter(isGoogleResult).map((row) => row.place_id),
  )
  const googlePlaces = googleRows.filter((row) => shownGooglePlaceIds.has(row.place_id))

  return {
    tpResults,
    googlePlaces,
    errors,
  }
}
