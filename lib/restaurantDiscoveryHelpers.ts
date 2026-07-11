import type { SavedLocationPreference } from '@/constants/locations'
import { expandCuisineParamToSlugs } from '@/lib/palateSearch'
import { expandCategoryParamToSlugs } from '@/lib/categorySearch'
import { RESTAURANT_PARENT_CATEGORIES } from '@/constants/restaurantCategories'
import { QUICK_FINDS } from '@/constants/quickFinds'
import {
  formatRestaurantCardAddress,
  formatShortFormattedAddress,
} from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

/** Browse/search card subtitle — street and city only. */
export function formatRestaurantSearchResultAddress(
  result: RestaurantSearchResult,
): string | null {
  if (isTPResult(result)) {
    return formatRestaurantCardAddress(result.listing_street, result.address)
  }
  return formatShortFormattedAddress(result.address)
}

/** First segment of location label for backend `city_name` filter. */
export function cityNameFromLocation(location: SavedLocationPreference): string | undefined {
  const label = location.label?.trim()
  if (!label || label === '…') return undefined
  const city = label.split(',')[0]?.trim()
  return city && city.length > 0 ? city : undefined
}

export function splitDiscoveryResults(results: RestaurantSearchResult[]): {
  tpResults: RestaurantSearchResult[]
  googleResults: RestaurantSearchResult[]
} {
  const tpResults: RestaurantSearchResult[] = []
  const googleResults: RestaurantSearchResult[] = []
  for (const row of results) {
    if (isTPResult(row)) tpResults.push(row)
    else if (isGoogleResult(row)) googleResults.push(row)
  }
  return { tpResults, googleResults }
}

/** Maps a cuisine pill slug or region key to TP `cuisine_slugs` query values. */
export function cuisineSlugsForFilter(slug: string | null | undefined): string[] | undefined {
  const expanded = expandCuisineParamToSlugs(slug)
  return expanded.length > 0 ? expanded : undefined
}

/** Maps a category route param to TP `category_slugs` query values. */
export function categorySlugsForFilter(slug: string | null | undefined): string[] | undefined {
  const expanded = expandCategoryParamToSlugs(slug)
  return expanded.length > 0 ? expanded : undefined
}

/** Optional Google Nearby / text hint from a cuisine pill slug. */
export function googleKeywordForCuisine(slug: string | null | undefined): string | null {
  const trimmed = slug?.trim()
  if (!trimmed) return null
  const label = QUICK_FINDS.find((item) => item.slug === trimmed)?.label
  if (!label) return null
  return `${label} restaurant`
}

/** Optional Google Nearby keyword from a category slug. */
export function googleKeywordForCategory(slug: string | null | undefined): string | null {
  const trimmed = slug?.trim().toLowerCase()
  if (!trimmed) return null
  const label = RESTAURANT_PARENT_CATEGORIES.find((item) => item.slug === trimmed)?.label
  if (!label) return null
  return `${label} restaurant`
}

export function discoveryErrorMessage(errors: { tp?: string; google?: string }): string | null {
  const parts: string[] = []
  if (errors.tp) parts.push(`TastyPlates: ${errors.tp}`)
  if (errors.google) parts.push(`Google: ${errors.google}`)
  return parts.length > 0 ? parts.join(' · ') : null
}
