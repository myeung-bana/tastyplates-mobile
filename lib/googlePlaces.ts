/**
 * Classic Google Places Web Service (REST).
 * Requires `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` with Places enabled.
 */

import type { LocationCoordinates } from '@/constants/locations'
import { CITY_SEARCH_RADIUS_METERS } from '@/lib/geoUtils'

const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/place'

/** Google `types` that indicate food / drink venues. */
export const GASTRONOMY_PLACE_TYPES = [
  'restaurant',
  'food',
  'meal',
  'cafe',
  'bakery',
  'bar',
] as const

/** Lodging, health, and similar — excluded even when Google also tags `restaurant`. */
export const EXCLUDED_NON_RESTAURANT_PLACE_TYPES = [
  'lodging',
  'hotel',
  'motel',
  'hostel',
  'guest_house',
  'bed_and_breakfast',
  'resort_hotel',
  'extended_stay_hotel',
  'rv_park',
  'doctor',
  'physician',
  'hospital',
  'health',
  'dentist',
  'pharmacy',
  'veterinary_care',
  'medical_lab',
  'physiotherapist',
  'chiropractor',
] as const

const EXCLUDED_NAME_PATTERN =
  /\b(hotel|motel|hostel|inn|resort|doctor|dr\.|medical|clinic|dentist|pharmacy|hospital|physician|acupuncture|veterinar|medicine|wellness\s+center)\b/i

const RESTAURANT_NAME_PATTERN =
  /\b(restaurant|grill|bistro|cafe|café|kitchen|diner|eatery|bar|bakery|pizzeria|sushi|ramen|bbq|tavern|pub|food)\b/i

function normalizePlaceTypes(types: string[] | null | undefined): string[] {
  return (types ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
}

/**
 * True when a Google place should appear in restaurant discovery (nearby, autocomplete, merge).
 * Hotels often include `restaurant` in `types` while primary category is `lodging`.
 */
export function isRestaurantLikeGooglePlace(
  types: string[] | null | undefined,
  name?: string | null,
): boolean {
  const label = (name ?? '').trim()
  if (label.length > 0 && EXCLUDED_NAME_PATTERN.test(label)) return false

  const normalized = normalizePlaceTypes(types)

  if (
    normalized.some((t) =>
      EXCLUDED_NON_RESTAURANT_PLACE_TYPES.some((ex) => t === ex || t.includes(ex)),
    )
  ) {
    return false
  }

  if (normalized.length === 0) {
    const label = (name ?? '').trim()
    if (!label.length) return false
    if (EXCLUDED_NAME_PATTERN.test(label)) return false
    if (RESTAURANT_NAME_PATTERN.test(label)) return true
    return false
  }

  return normalized.some((t) =>
    GASTRONOMY_PLACE_TYPES.some((k) => t === k || t.includes(k)),
  )
}

function getPlacesApiKey(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim()
}

export interface PlacesAutocompletePrediction {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
  /** Used to rank gastronomy-heavy rows client-side when present. */
  types?: string[]
}

interface AutocompletePayload {
  predictions?: PlacesAutocompletePrediction[]
  status: string
  error_message?: string
}

interface GeocodeLatLngLiteral {
  lat: number
  lng: number
}

/** Single review snippet from Place Details `reviews` (API returns up to 5). */
export interface GooglePlaceReview {
  author_name?: string
  author_url?: string
  language?: string
  profile_photo_url?: string
  rating?: number
  relative_time_description?: string
  text?: string
  time?: number
}

export interface PlacesDetailsResult {
  place_id: string
  name?: string
  formatted_address?: string
  adr_address?: string
  vicinity?: string
  geometry?: { location?: GeocodeLatLngLiteral }
  types?: string[]
  rating?: number
  user_ratings_total?: number
  photos?: { photo_reference: string }[]
  reviews?: GooglePlaceReview[]
}

export type FetchGooglePlaceDetailsOptions = {
  /** Request `reviews` field (up to 5 snippets). Use on detail pages only. */
  includeReviews?: boolean
}

interface DetailsPayload {
  result?: PlacesDetailsResult
  status: string
  error_message?: string
}

/** Build Places Photo URL from a photo reference. */
export function googlePlacePhotoUrl(photoReference: string, maxWidth = 560): string {
  const key = getPlacesApiKey()
  const ref = encodeURIComponent(photoReference)
  return `${GEOCODE_BASE}/photo?maxwidth=${maxWidth}&photoreference=${ref}&key=${encodeURIComponent(key)}`
}

/** Autocomplete (establishment-heavy) with optional geo bias circle. */
export async function autocompletePlacesEstablishments(
  input: string,
  bias?: LocationCoordinates | null,
): Promise<PlacesAutocompletePrediction[]> {
  const key = getPlacesApiKey()
  const q = input.trim()
  if (!key || q.length < 2) return []

  const params = new URLSearchParams({
    input: q,
    key,
    types: 'establishment',
  })

  if (bias?.latitude != null && bias.longitude != null) {
    params.set('location', `${bias.latitude},${bias.longitude}`)
    params.set('radius', String(CITY_SEARCH_RADIUS_METERS))
  }

  const url = `${GEOCODE_BASE}/autocomplete/json?${params.toString()}`
  const res = await fetch(url)
  const raw = (await res.json()) as AutocompletePayload
  if (raw.status !== 'OK' && raw.status !== 'ZERO_RESULTS') {
    throw new Error(raw.error_message || `Autocomplete failed (${raw.status})`)
  }
  return raw.predictions ?? []
}

/** Place Details (minimal fields needed for TP matching). */
export async function fetchGooglePlaceDetails(
  placeId: string,
  signal?: AbortSignal,
  options: FetchGooglePlaceDetailsOptions = {},
): Promise<PlacesDetailsResult | null> {
  const key = getPlacesApiKey()
  if (!key) return null

  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'vicinity',
    'geometry',
    'types',
    'rating',
    'user_ratings_total',
    'photos',
  ]
  if (options.includeReviews) fields.push('reviews')

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: fields.join(','),
  })

  const url = `${GEOCODE_BASE}/details/json?${params.toString()}`
  const res = await fetch(url, { signal })
  const payload = (await res.json()) as DetailsPayload

  if (payload.status === 'ZERO_RESULTS') return null

  if (payload.status !== 'OK') {
    throw new Error(payload.error_message ?? `Places details failed (${payload.status})`)
  }

  return payload.result ?? null
}

export interface NearbyPlaceRow {
  place_id: string
  name: string
  address: string | null
  latitude?: number | null
  longitude?: number | null
  photo_reference: string | null
  google_rating?: number | null
  types?: string[] | null
}

export type GetNearbyRestaurantsOptions = {
  maxResults?: number
  maxPages?: number
}

const GOOGLE_NEARBY_PAGE_DELAY_MS = 2_100

function parseNearbyPlaceRow(entry: unknown): NearbyPlaceRow | null {
  const p = entry as Record<string, unknown>
  const types = Array.isArray(p.types) ? (p.types as string[]) : null
  const name = typeof p.name === 'string' ? p.name : null
  if (!isRestaurantLikeGooglePlace(types, name)) return null

  const geom = p.geometry as Record<string, unknown> | undefined
  const loc = geom?.location as Record<string, unknown> | undefined
  const plat = typeof loc?.lat === 'number' ? loc.lat : null
  const plng = typeof loc?.lng === 'number' ? loc.lng : null
  const photoArr = Array.isArray(p.photos) ? p.photos : []
  const firstPhoto = photoArr[0] as { photo_reference?: string } | undefined
  const photoRef =
    firstPhoto?.photo_reference && typeof firstPhoto.photo_reference === 'string'
      ? firstPhoto.photo_reference
      : null
  const address: string | null =
    typeof p.vicinity === 'string'
      ? p.vicinity
      : typeof p.formatted_address === 'string'
        ? p.formatted_address
        : null

  const placeId = typeof p.place_id === 'string' ? p.place_id : ''
  if (!placeId || !name) return null

  return {
    place_id: placeId,
    name,
    address,
    latitude: plat,
    longitude: plng,
    photo_reference: photoRef,
    google_rating: typeof p.rating === 'number' ? p.rating : null,
    types,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Google Places Nearby Search — restaurants anchored to the user's selected city coords. */
export async function getNearbyRestaurants(
  center: LocationCoordinates | null | undefined,
  radiusMeters = 1500,
  keyword?: string | null,
  options: GetNearbyRestaurantsOptions = {},
): Promise<NearbyPlaceRow[]> {
  const key = getPlacesApiKey()
  if (!center || !key) return []
  const { latitude: lat, longitude: lng } = center
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []

  const maxResults = options.maxResults ?? 10
  const maxPages = options.maxPages ?? 1

  interface NearbyPayload {
    results?: unknown[]
    next_page_token?: string
    status: string
    error_message?: string
  }

  const collected: NearbyPlaceRow[] = []
  const seenPlaceIds = new Set<string>()
  let pageToken: string | undefined

  for (let page = 0; page < maxPages && collected.length < maxResults; page++) {
    if (page > 0) {
      if (!pageToken) break
      await delay(GOOGLE_NEARBY_PAGE_DELAY_MS)
    }

    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radiusMeters),
      type: 'restaurant',
      key,
    })
    const kw = keyword?.trim()
    if (kw) params.set('keyword', kw)
    if (pageToken) params.set('pagetoken', pageToken)

    const url = `${GEOCODE_BASE}/nearbysearch/json?${params.toString()}`
    const res = await fetch(url)
    const raw = (await res.json()) as NearbyPayload

    if (raw.status !== 'OK' && raw.status !== 'ZERO_RESULTS') {
      break
    }

    for (const entry of raw.results ?? []) {
      if (collected.length >= maxResults) break
      const row = parseNearbyPlaceRow(entry)
      if (!row || seenPlaceIds.has(row.place_id)) continue
      seenPlaceIds.add(row.place_id)
      collected.push(row)
    }

    pageToken = raw.next_page_token
    if (!pageToken || (raw.results ?? []).length === 0) break
  }

  return collected
}
