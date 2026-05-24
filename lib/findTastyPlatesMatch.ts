import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/** Row returned from `restaurants-v2/match-restaurant`. */
export interface MatchedRestaurant {
  uuid: string
  title: string
  slug: string
  listing_street: string | null
  featured_image_url: string | null
  average_rating: number | null
  ratings_count: number | null
}

interface MatchRestaurantResponse {
  matched: MatchedRestaurant[]
}

/**
 * Prefer Google `place_id` against TP; fuzzy name/street fallback when documented by API.
 */
export async function matchRestaurantPlaceId(placeId: string): Promise<MatchedRestaurant[]> {
  const envelope = await tastyplatesFetch<MatchRestaurantResponse>('restaurants-v2/match-restaurant', {
    method: 'POST',
    body: JSON.stringify({ placeId }),
  })

  try {
    const data = unwrapEnvelope(envelope)
    return data.matched ?? []
  } catch {
    return []
  }
}

export async function matchRestaurantNameAddress(
  name: string,
  address: string,
): Promise<MatchedRestaurant[]> {
  const envelope = await tastyplatesFetch<MatchRestaurantResponse>('restaurants-v2/match-restaurant', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      address: address.trim(),
    }),
  })

  try {
    const data = unwrapEnvelope(envelope)
    return data.matched ?? []
  } catch {
    return []
  }
}

export async function matchRestaurantFlexible(options: {
  placeId?: string | null
  name?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
}): Promise<MatchedRestaurant[]> {
  if (options.placeId?.trim()) {
    const byPlace = await matchRestaurantPlaceId(options.placeId.trim())
    if (byPlace.length) return byPlace
  }

  if (options.name?.trim() && options.address?.trim()) {
    const fuzzy = await matchRestaurantNameAddress(options.name, options.address)
    return fuzzy
  }

  return []
}

/** Primary match for inline card — first row from Nhost `matched` array. */
export async function matchRestaurantForPlace(options: {
  placeId: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
}): Promise<MatchedRestaurant | null> {
  const rows = await matchRestaurantFlexible(options)
  const first = rows[0]
  if (first) return first
  return null
}
