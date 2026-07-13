import type { SavedLocationPreference } from '@/constants/locations'
import { expandCuisineParamToSlugs } from '@/lib/palateSearch'
import { expandCategoryParamToSlugs } from '@/lib/categorySearch'
import { RESTAURANT_PARENT_CATEGORIES } from '@/constants/restaurantCategories'
import { QUICK_FINDS } from '@/constants/quickFinds'
import {
  coerceRatingNumber,
  hasDisplayableRating,
} from '@/lib/ratingDisplayUtils'
import { restaurantSearchResultRating } from '@/lib/restaurantSearchMerge'
import type { PreferenceStat } from '@/services/preferenceStatsService'
import {
  formatRestaurantCardAddress,
  formatShortFormattedAddress,
} from '@/services/restaurantsV2Service'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

/** Browse/search card subtitle — street and city only. */
export function formatRestaurantSearchResultAddress(
  result: RestaurantSearchResult,
  cityFallback?: string | null,
): string | null {
  if (isTPResult(result)) {
    return formatRestaurantCardAddress(result.listing_street, result.address)
  }
  const formatted = formatShortFormattedAddress(result.address)
  if (formatted) return formatted
  const raw = result.address?.trim()
  if (raw && raw.length > 0) return raw
  const city = cityFallback?.trim()
  return city && city.length > 0 ? city : null
}

export type BrowseCardPropsFromSearchResult = {
  subtitle: string | null
  rating: number | null
  ratingMode: 'overall' | 'palate-match'
  searchPalateRating: number | null
  searchPalateReviewCount?: number | null
}

/**
 * Unified browse-card display props for TP + Google gap-fill rows.
 * Google listings always use overall Google rating (no palate match).
 */
export function browseCardPropsFromSearchResult(
  item: RestaurantSearchResult,
  options: {
    isPersonalised: boolean
    cityLabel?: string | null
    palateStat?: PreferenceStat | null
  },
): BrowseCardPropsFromSearchResult {
  const subtitle = formatRestaurantSearchResultAddress(item, options.cityLabel)

  if (isGoogleResult(item)) {
    return {
      subtitle,
      rating: coerceRatingNumber(item.google_rating),
      ratingMode: 'overall',
      searchPalateRating: null,
    }
  }

  const overallRating = coerceRatingNumber(item.average_rating)
  if (options.isPersonalised && options.palateStat) {
    return {
      subtitle,
      rating: overallRating,
      ratingMode: 'palate-match',
      searchPalateRating: options.palateStat.avg ?? null,
      searchPalateReviewCount: options.palateStat.count ?? null,
    }
  }

  return {
    subtitle,
    rating: overallRating,
    ratingMode: 'overall',
    searchPalateRating: null,
  }
}

/** Compact list-row rating — Google overall or TP overall (not palate match). */
export function listRowRatingForSearchResult(
  result: RestaurantSearchResult,
): number | null {
  const rating = restaurantSearchResultRating(result)
  return hasDisplayableRating(rating) ? rating : null
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
