import type { LocationCoordinates } from '@/constants/locations'
import { geoQueryFromCityCenter } from '@/lib/geoUtils'
import { enrichGoogleCandidatesWithDetails } from '@/lib/googlePlaceEnrichment'
import {
  autocompletePlacesEstablishments,
  getNearbyRestaurants,
  isRestaurantLikeGooglePlace,
} from '@/lib/googlePlaces'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { mergeRestaurantResults, computeGoogleMergeSlots } from '@/lib/restaurantSearchMerge'
import { googleTagFallbacksFromBrowseFilters } from '@/lib/adaptGooglePlaceTypes'
import { splitDiscoveryResults } from '@/lib/restaurantDiscoveryHelpers'
import {
  GOOGLE_GAP_FILL_MAX_PICKER,
  GOOGLE_NEARBY_MAX_PAGES,
  GOOGLE_NEARBY_MAX_RESULTS,
  googleGapFillMaxForMode,
  limitForHybridSearchMode,
  NEARBY_PICKER_RADIUS_METERS,
  type HybridSearchGeoMode,
  type HybridSearchMode,
} from '@/lib/restaurantSearchConfig'
import { getRestaurants } from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult } from '@/types/restaurantSearchResult'

const AUTOCOMPLETE_CAP = 8

function gastronomyScore(types: string[] | undefined): number {
  if (!types?.length) return 0
  let v = 0
  if (types.some((x) => x.includes('restaurant'))) v += 3
  if (types.some((x) => x.includes('food') || x.includes('meal') || x.includes('cafe'))) v += 2
  if (types.some((x) => x.includes('bakery') || x.includes('bar'))) v += 2
  if (types.some((x) => x.includes('establishment'))) v += 1
  return v
}

function filterEstablishmentPredictions(
  rows: Awaited<ReturnType<typeof autocompletePlacesEstablishments>>,
): Awaited<ReturnType<typeof autocompletePlacesEstablishments>> {
  const filtered = rows.filter((p) => {
    const name = p.structured_formatting?.main_text ?? p.description
    return isRestaurantLikeGooglePlace(p.types, name)
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
  /** Filter TP rows by category slug(s) — maps to Hasura `category_slugs`. */
  categorySlugs?: string[]
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

  const cuisineFilterActive = Boolean(options.cuisineSlugs?.length)
  const categoryFilterActive = Boolean(options.categorySlugs?.length)
  const taxonomyFilterActive = cuisineFilterActive || categoryFilterActive
  const palateSortActive = Boolean(options.palateSlug?.trim())
  const palateSlug = options.palateSlug ?? null

  const [tpResult, googlePredictions] = await Promise.allSettled([
    hasTextQuery
      ? getRestaurants({
          search: trimmed,
          limit,
          locationKey,
          cityName: options.cityName,
          order_by: taxonomyFilterActive ? 'rating_desc' : palateSortActive ? 'smart' : undefined,
          cuisineSlugs: options.cuisineSlugs,
          categorySlugs: options.categorySlugs,
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

  const googleGapMax = googleGapFillMaxForMode(mode)
  const googleSlots = computeGoogleMergeSlots(tpRows.length, {
    targetPageSize: limit,
    googleLimit: googleGapMax,
    palateSlug,
  })

  const shouldEnrichGoogle =
    !palateSortActive && googleSlots > 0 && googleCandidates.length > 0

  if (shouldEnrichGoogle) {
    googleCandidates = await enrichGoogleCandidatesWithDetails(
      googleCandidates,
      coordinates,
      googleSlots,
      { signal },
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

  const tagFallbacks = googleTagFallbacksFromBrowseFilters(
    options.cuisineSlugs?.[0],
    options.categorySlugs?.[0],
  )
  const googleTagOptions = {
    googleCuisineFallback: tagFallbacks.cuisineFallback ?? null,
    googleCategoryFallback: tagFallbacks.categoryFallback ?? null,
  }

  const results = mergeRestaurantResults(tpRows, googleCandidates, {
    targetPageSize: limit,
    googleLimit: googleGapMax,
    palateSlug,
    ...googleTagOptions,
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
  categorySlugs?: string[]
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
      categorySlugs: options.categorySlugs,
      ...geo,
    }),
    coordinates
      ? getNearbyRestaurants(
          coordinates,
          NEARBY_PICKER_RADIUS_METERS,
          options.googleKeyword ?? null,
          {
            maxResults: GOOGLE_GAP_FILL_MAX_PICKER,
            maxPages: 1,
          },
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

  const tagFallbacks = googleTagFallbacksFromBrowseFilters(
    options.cuisineSlugs?.[0],
    options.categorySlugs?.[0],
  )

  const merged = mergeRestaurantResults(tpRows, googleRows, {
    targetPageSize: limitForHybridSearchMode('listPicker'),
    googleLimit: GOOGLE_GAP_FILL_MAX_PICKER,
    googleCuisineFallback: tagFallbacks.cuisineFallback ?? null,
    googleCategoryFallback: tagFallbacks.categoryFallback ?? null,
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
