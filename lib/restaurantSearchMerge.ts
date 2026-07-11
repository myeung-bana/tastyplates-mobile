import type { NearbyPlaceRow } from '@/lib/googlePlaces'
import { googlePlacePhotoUrl } from '@/lib/googlePlaces'
import {
  GOOGLE_GAP_FILL_MAX,
  SEARCH_BROWSE_LIMIT,
} from '@/lib/restaurantSearchConfig'
import {
  normalizeCategoryList,
  normalizeCuisineList,
  type RestaurantListRow,
} from '@/services/restaurantsV2Service'
import type {
  GoogleRestaurantResult,
  RestaurantSearchResult,
  TPRestaurantResult,
} from '@/types/restaurantSearchResult'

function extractGooglePlaceId(row: RestaurantListRow): string | null {
  const column = row.google_place_id?.trim()
  if (column && column.length > 0) return column
  const addr = row.address as { place_id?: string } | null | undefined
  const pid = addr?.place_id?.trim()
  return pid && pid.length > 0 ? pid : null
}

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
    google_place_id: row.google_place_id?.trim() || extractGooglePlaceId(row),
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    _distance: row._distance ?? null,
  }
}

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

function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tpRowKey(row: RestaurantListRow): string {
  return row.uuid?.trim() || row.slug?.trim() || String(row.id)
}

function dedupeTpRows(rows: RestaurantListRow[]): RestaurantListRow[] {
  const seen = new Set<string>()
  const deduped: RestaurantListRow[] = []
  for (const row of rows) {
    const key = tpRowKey(row)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped
}

export function restaurantSearchResultId(r: RestaurantSearchResult): string {
  if (r.source === 'tp') {
    return r.uuid?.trim() || r.slug?.trim() || String(r.id)
  }
  return `google:${r.place_id}`
}

/** Ensures list/map keys stay unique across merge, pagination, and API overlap. */
export function dedupeRestaurantSearchResults(
  results: RestaurantSearchResult[],
): RestaurantSearchResult[] {
  const seen = new Set<string>()
  const deduped: RestaurantSearchResult[] = []
  for (const result of results) {
    const key = restaurantSearchResultId(result)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(result)
  }
  return deduped
}

export interface MergeRestaurantResultsOptions {
  /** Combined page target — Google fills up to `targetPageSize - tpCount`. */
  targetPageSize?: number
  /** Cap on Google rows appended in one merge. */
  googleLimit?: number
  /** When TP count >= this value, skip Google entirely. Defaults to `targetPageSize`. */
  suppressGoogleWhenTPCount?: number
  /** When set, Google rows are suppressed — palate scores are TP-only. */
  palateSlug?: string | null
  /** @deprecated Ignored — cuisine browse uses the same gap-fill rules. */
  cuisineFilterActive?: boolean
}

/** How many Google slots to append after TP rows for a single merge. */
export function computeGoogleMergeSlots(
  tpCount: number,
  options: Pick<
    MergeRestaurantResultsOptions,
    'targetPageSize' | 'googleLimit' | 'suppressGoogleWhenTPCount' | 'palateSlug'
  > = {},
): number {
  if (options.palateSlug?.trim()) return 0

  const target = options.targetPageSize ?? SEARCH_BROWSE_LIMIT
  const maxGoogle = options.googleLimit ?? GOOGLE_GAP_FILL_MAX
  const suppressAt = options.suppressGoogleWhenTPCount ?? target

  if (tpCount >= suppressAt) return 0
  return Math.min(maxGoogle, Math.max(0, target - tpCount))
}

/**
 * Merge TastyPlates DB results with Google Places results.
 * TP rows first; Google rows appended to gap-fill up to `targetPageSize`.
 */
export function mergeRestaurantResults(
  tpRows: RestaurantListRow[],
  googlePlaces: NearbyPlaceRow[],
  options: MergeRestaurantResultsOptions = {},
): RestaurantSearchResult[] {
  const uniqueTpRows = dedupeTpRows(tpRows)
  const merged: RestaurantSearchResult[] = uniqueTpRows.map(toTPResult)

  const googleSlots = computeGoogleMergeSlots(uniqueTpRows.length, options)
  if (googleSlots <= 0 || googlePlaces.length === 0) {
    return dedupeRestaurantSearchResults(merged)
  }

  const tpNames = new Set(uniqueTpRows.map((r) => normName(r.title)))
  const tpPlaceIds = new Set(
    uniqueTpRows
      .map(extractGooglePlaceId)
      .filter((id): id is string => id != null && id.length > 0),
  )

  let googleAdded = 0
  for (const place of googlePlaces) {
    if (googleAdded >= googleSlots) break
    if (!place.place_id || !place.name) continue
    if (tpPlaceIds.has(place.place_id)) continue
    if (tpNames.has(normName(place.name))) continue
    merged.push(toGoogleResult(place))
    googleAdded++
  }

  return dedupeRestaurantSearchResults(merged)
}

export function restaurantSearchResultCoords(r: RestaurantSearchResult): {
  latitude: number | null
  longitude: number | null
} {
  if (r.source === 'tp') {
    return { latitude: r.latitude, longitude: r.longitude }
  }
  return { latitude: r.latitude ?? null, longitude: r.longitude ?? null }
}

export function restaurantSearchResultRating(r: RestaurantSearchResult): number | null {
  if (r.source === 'tp') {
    const n = r.average_rating
    return n != null && n > 0 ? n : null
  }
  const g = r.google_rating
  return g != null && g > 0 ? g : null
}
