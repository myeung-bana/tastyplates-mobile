import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/** Row shape returned by `restaurants-v2/get-restaurants` (Hasura `restaurants` list). */
export interface RestaurantListRow {
  id: number
  uuid: string
  title: string
  slug: string
  status: string
  price_range_id: number | null
  average_rating: number | null
  ratings_count: number | null
  listing_street: string | null
  longitude: number | null
  latitude: number | null
  featured_image_url: string | null
  address: {
    city?: string
    country_short?: string
    street_address?: string
  } | null
  cuisines: unknown
  palates: unknown
  categories: unknown
  is_main_location: boolean | null
  created_at: string
  updated_at: string
  published_at: string | null
  _distance?: number | null
}

export interface GetRestaurantsMeta {
  total: number
  limit: number
  offset?: number
  cursor: string | null
  hasMore: boolean
  fetchedAt: string
}

export interface GetRestaurantsResponse {
  restaurants: RestaurantListRow[]
  meta: GetRestaurantsMeta
}

export interface GetRestaurantsParams {
  search?: string
  palateSlugs?: string[]
  limit?: number
  cursor?: string | null
  order_by?: string
  locationKey?: string
}

function buildQuery(params: GetRestaurantsParams): string {
  const qs = new URLSearchParams()
  const limit = params.limit ?? 24
  qs.set('limit', String(limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.palateSlugs?.length) qs.set('palate_slugs', params.palateSlugs.filter(Boolean).join(','))
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.order_by) qs.set('order_by', params.order_by)
  if (params.locationKey?.trim()) qs.set('location_key', params.locationKey.trim())
  return qs.toString()
}

/**
 * List / filter restaurants via Nhost Functions (public read).
 */
export async function getRestaurants(params: GetRestaurantsParams = {}): Promise<GetRestaurantsResponse> {
  const query = buildQuery(params)
  const envelope = await tastyplatesFetch<GetRestaurantsResponse>(
    `restaurants-v2/get-restaurants?${query}`,
  )
  return unwrapEnvelope(envelope)
}

export function formatRestaurantListSubtitle(
  listingStreet: string | null | undefined,
  address: RestaurantListRow['address'],
): string | null {
  if (listingStreet?.trim()) return listingStreet.trim()
  if (address?.street_address?.trim()) return address.street_address.trim()
  if (address?.city) {
    return address.country_short ? `${address.city}, ${address.country_short}` : address.city
  }
  return null
}
