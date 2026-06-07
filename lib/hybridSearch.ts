import type { LocationCoordinates } from '@/constants/locations'
import { geoQueryFromCityCenter } from '@/lib/geoUtils'
import { autocompletePlacesEstablishments } from '@/lib/googlePlaces'
import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { mergeRestaurantResults } from '@/lib/restaurantSearchMerge'
import { getRestaurants } from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

const GASTRONOMY_TYPES = ['restaurant', 'food', 'meal', 'cafe', 'bakery', 'bar']

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

/**
 * Hybrid text search: TP DB + Google Autocomplete, merged and deduped.
 */
export async function hybridSearch(
  query: string,
  locationKey: string,
  coordinates: LocationCoordinates | null,
  options: {
    palateSlugs?: string[]
    limit?: number
    palateSlug?: string | null
  } = {},
): Promise<{ results: RestaurantSearchResult[]; cursor: string | null; hasMore: boolean }> {
  const limit = options.limit ?? 24
  const trimmed = query.trim()
  const geo = geoQueryFromCityCenter(coordinates)

  const [tpResult, googlePredictions] = await Promise.allSettled([
    getRestaurants({
      search: trimmed,
      palateSlugs: options.palateSlugs,
      limit,
      locationKey,
      ...geo,
    }),
    trimmed.length >= 2 ? autocompletePlacesEstablishments(trimmed, coordinates) : Promise.resolve([]),
  ])

  const tpRows = tpResult.status === 'fulfilled' ? tpResult.value.restaurants : []
  const cursor = tpResult.status === 'fulfilled' ? tpResult.value.meta.cursor : null
  const hasMore = tpResult.status === 'fulfilled' ? tpResult.value.meta.hasMore : false

  const googleCandidates: NearbyPlaceRow[] = []

  if (googlePredictions.status === 'fulfilled') {
    const predictions = filterEstablishmentPredictions(googlePredictions.value).slice(0, 8)

    for (const pred of predictions) {
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
  }

  const results = mergeRestaurantResults(tpRows, googleCandidates, {
    googleLimit: 6,
    suppressGoogleWhenTPCount: 24,
    palateSlug: options.palateSlug ?? null,
  })

  return { results, cursor, hasMore }
}
