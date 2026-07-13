import type { LocationCoordinates } from '@/constants/locations'
import { CITY_SEARCH_RADIUS_KM, isWithinRadiusKm } from '@/lib/geoUtils'
import {
  fetchGooglePlaceDetails,
  isRestaurantLikeGooglePlace,
  type NearbyPlaceRow,
} from '@/lib/googlePlaces'

export type EnrichGoogleCandidatesOptions = {
  signal?: AbortSignal
  /** Geo filter radius when merging coords from Place Details (defaults to city cap). */
  radiusKm?: number
}

/**
 * Backfill address, rating, photo, and coords from Place Details for gap-fill rows.
 * Used by hybrid keyword search and Explore idle browse.
 */
export async function enrichGoogleCandidatesWithDetails(
  candidates: NearbyPlaceRow[],
  coordinates: LocationCoordinates | null,
  maxEnrich: number,
  options: EnrichGoogleCandidatesOptions = {},
): Promise<NearbyPlaceRow[]> {
  if (candidates.length === 0 || maxEnrich <= 0) return candidates

  const radiusKm = options.radiusKm ?? CITY_SEARCH_RADIUS_KM
  const toEnrich = candidates.slice(0, maxEnrich)
  const enriched = await Promise.allSettled(
    toEnrich.map(async (candidate) => {
      const details = await fetchGooglePlaceDetails(candidate.place_id, options.signal)
      if (!details) return candidate

      const lat = details.geometry?.location?.lat ?? null
      const lng = details.geometry?.location?.lng ?? null

      if (
        coordinates &&
        lat != null &&
        lng != null &&
        !isWithinRadiusKm(coordinates, lat, lng, radiusKm)
      ) {
        return candidate
      }

      return {
        ...candidate,
        latitude: lat,
        longitude: lng,
        google_rating: details.rating ?? candidate.google_rating ?? null,
        google_review_count:
          details.user_ratings_total ?? candidate.google_review_count ?? null,
        photo_reference: details.photos?.[0]?.photo_reference ?? candidate.photo_reference,
        address:
          details.formatted_address ??
          details.vicinity ??
          candidate.address,
        types: details.types ?? candidate.types,
      } satisfies NearbyPlaceRow
    }),
  )

  if (options.signal?.aborted) return candidates

  const enrichedByPlaceId = new Map<string, NearbyPlaceRow>()
  toEnrich.forEach((candidate, index) => {
    const result = enriched[index]
    if (result.status === 'fulfilled' && result.value) {
      enrichedByPlaceId.set(candidate.place_id, result.value)
    }
  })

  return candidates
    .map((c) => enrichedByPlaceId.get(c.place_id) ?? c)
    .filter((c) => isRestaurantLikeGooglePlace(c.types, c.name))
}
