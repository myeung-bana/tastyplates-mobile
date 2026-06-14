import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export interface RestaurantListCuisine {
  id: number
  name: string
  slug: string
}

export interface RestaurantListCategory {
  id: number
  name: string
  slug: string
  parent_id?: number | null
}

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
  google_place_id?: string | null
  address: {
    city?: string
    country_short?: string
    street_address?: string
    place_id?: string
  } | null
  cuisines: RestaurantListCuisine[] | unknown
  palates: unknown
  categories: RestaurantListCategory[] | unknown
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
  cuisineSlugs?: string[]
  limit?: number
  cursor?: string | null
  order_by?: string
  locationKey?: string
  cityName?: string
  latitude?: number
  longitude?: number
  radiusKm?: number
}

function parseJsonbField(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown
    } catch {
      return null
    }
  }
  return value
}

/** JSONB `cuisines` may arrive as array, string, or null — always return an array. */
export function normalizeCuisineList(value: unknown): RestaurantListCuisine[] {
  const parsed = parseJsonbField(value)
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id),
      name: String(item.name ?? '').trim(),
      slug: String(item.slug ?? '').trim(),
    }))
    .filter((item) => item.name.length > 0)
}

/** JSONB `categories` may arrive as array, string, or null — always return an array. */
export function normalizeCategoryList(value: unknown): RestaurantListCategory[] {
  const parsed = parseJsonbField(value)
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id),
      name: String(item.name ?? '').trim(),
      slug: String(item.slug ?? '').trim(),
      parent_id:
        item.parent_id === null || item.parent_id === undefined
          ? null
          : Number(item.parent_id),
    }))
    .filter((item) => item.name.length > 0)
}

export function normalizeRestaurantListRow(row: RestaurantListRow): RestaurantListRow {
  return {
    ...row,
    cuisines: normalizeCuisineList(row.cuisines),
    categories: normalizeCategoryList(row.categories),
  }
}

function buildQuery(params: GetRestaurantsParams): string {
  const qs = new URLSearchParams()
  const limit = params.limit ?? 24
  qs.set('limit', String(limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.palateSlugs?.length) qs.set('palate_slugs', params.palateSlugs.filter(Boolean).join(','))
  if (params.cuisineSlugs?.length) qs.set('cuisine_slugs', params.cuisineSlugs.filter(Boolean).join(','))
  if (params.cursor) qs.set('cursor', params.cursor)
  if (params.order_by) qs.set('order_by', params.order_by)
  if (params.locationKey?.trim()) qs.set('location_key', params.locationKey.trim())
  if (params.cityName?.trim()) qs.set('city_name', params.cityName.trim())
  if (params.latitude != null && Number.isFinite(params.latitude)) {
    qs.set('latitude', String(params.latitude))
  }
  if (params.longitude != null && Number.isFinite(params.longitude)) {
    qs.set('longitude', String(params.longitude))
  }
  if (params.radiusKm != null && Number.isFinite(params.radiusKm)) {
    qs.set('radius_km', String(params.radiusKm))
  }
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
  const data = unwrapEnvelope(envelope)
  const rows = Array.isArray(data.restaurants) ? data.restaurants : []
  return {
    ...data,
    restaurants: rows.map(normalizeRestaurantListRow),
  }
}

export type RestaurantAddressFields = RestaurantListRow['address']

function streetEndsWithCity(street: string, city: string): boolean {
  const s = street.toLowerCase()
  const c = city.toLowerCase()
  return s === c || s.endsWith(`, ${c}`)
}

/**
 * Browse card address: `street, city` (e.g. `146 Front St W, Toronto`).
 * @see documentation/design_system.md §11.3
 */
export function formatRestaurantCardAddress(
  listingStreet: string | null | undefined,
  address?: RestaurantAddressFields | null,
): string | null {
  const city = address?.city?.trim()
  const street =
    listingStreet?.trim() || address?.street_address?.trim() || null

  if (street && city) {
    if (streetEndsWithCity(street, city)) {
      const commaIdx = street.toLowerCase().lastIndexOf(`, ${city.toLowerCase()}`)
      if (commaIdx > 0) {
        return `${street.slice(0, commaIdx).trim()}, ${city}`
      }
      return street
    }
    if (street.includes(',')) {
      const streetLine = street.split(',')[0]?.trim()
      if (streetLine) return `${streetLine}, ${city}`
    }
    return `${street}, ${city}`
  }
  if (street) {
    if (street.includes(',')) return formatShortFormattedAddress(street)
    return street
  }
  if (city) {
    return address?.country_short ? `${city}, ${address.country_short}` : city
  }
  return null
}

/**
 * Short subtitle from a comma-separated address (street + city only).
 * e.g. `146 Front St W, Toronto, ON M5J 1G2, Canada` → `146 Front St W, Toronto`
 */
export function formatShortFormattedAddress(
  formatted: string | null | undefined,
): string | null {
  const raw = formatted?.trim()
  if (!raw) return null
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return `${parts[0]}, ${parts[1]}`
}

/** @deprecated Prefer `formatRestaurantCardAddress` for list/detail subtitle lines. */
export function formatRestaurantListSubtitle(
  listingStreet: string | null | undefined,
  address: RestaurantAddressFields,
): string | null {
  return formatRestaurantCardAddress(listingStreet, address)
}
