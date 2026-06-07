import type { SavedLocationPreference } from '@/constants/locations'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

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

export function discoveryErrorMessage(errors: { tp?: string; google?: string }): string | null {
  const parts: string[] = []
  if (errors.tp) parts.push(`TastyPlates: ${errors.tp}`)
  if (errors.google) parts.push(`Google: ${errors.google}`)
  return parts.length > 0 ? parts.join(' · ') : null
}
