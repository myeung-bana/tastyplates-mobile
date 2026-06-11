import { restaurantSearchResultRating } from '@/lib/restaurantSearchMerge'
import type { PreferenceStat } from '@/services/preferenceStatsService'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'
import { isGoogleResult, isTPResult } from '@/types/restaurantSearchResult'

const ZERO_STATS: PreferenceStat = { avg: 0, count: 0 }

function preferenceStatForRow(
  row: RestaurantSearchResult,
  statsByUuid: Map<string, PreferenceStat>,
): PreferenceStat {
  if (!isTPResult(row)) return ZERO_STATS
  const uuid = row.uuid?.trim()
  if (!uuid) return ZERO_STATS
  return statsByUuid.get(uuid) ?? ZERO_STATS
}

function reviewCountForRow(row: RestaurantSearchResult): number {
  if (isTPResult(row)) return row.ratings_count ?? 0
  if (isGoogleResult(row)) return row.google_review_count ?? 0
  return 0
}

/**
 * Client re-rank for Palate Sort (`PALATE_CONTEXT`) — mirrors web `Restaurant.tsx` comparator.
 */
export function sortRestaurantsByPalateMatch(
  rows: RestaurantSearchResult[],
  statsByUuid: Map<string, PreferenceStat>,
): RestaurantSearchResult[] {
  return [...rows].sort((a, b) => {
    const aStats = preferenceStatForRow(a, statsByUuid)
    const bStats = preferenceStatForRow(b, statsByUuid)

    const aPref = aStats.avg ?? -1
    const bPref = bStats.avg ?? -1
    if (aPref !== bPref) return bPref - aPref

    const aCount = aStats.count ?? 0
    const bCount = bStats.count ?? 0
    if (aCount !== bCount) return bCount - aCount

    const aRating = restaurantSearchResultRating(a) ?? 0
    const bRating = restaurantSearchResultRating(b) ?? 0
    const ratingDiff = bRating - aRating
    if (Math.abs(ratingDiff) > 0.01) return ratingDiff

    return reviewCountForRow(b) - reviewCountForRow(a)
  })
}
