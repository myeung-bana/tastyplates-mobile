/** Overlay live preview — fewer rows for faster response. */
export const SEARCH_PREVIEW_LIMIT = 12

/** Restaurants tab committed search page size. */
export const SEARCH_BROWSE_LIMIT = 24

/** List picker / add-to-list hybrid search page size. */
export const SEARCH_LIST_PICKER_LIMIT = 20

export const MERGE_GOOGLE_LIMIT_SEARCH = 6
export const MERGE_SUPPRESS_TP_COUNT_SEARCH = 24

/** Idle browse (no keyword) — kept separate from search merge thresholds. */
export const MERGE_GOOGLE_LIMIT_IDLE = 10
export const MERGE_SUPPRESS_TP_COUNT_IDLE = 20

/** Nearby radius for list picker idle state (meters). */
export const NEARBY_PICKER_RADIUS_METERS = 5_000

export type HybridSearchMode = 'preview' | 'browse' | 'listPicker'

/**
 * How city geo applies to TP text search:
 * - `off` — no lat/lng/radius (widest TP name match; use with cityName)
 * - `filter` — hard 50 km radius filter (map browse idle)
 */
export type HybridSearchGeoMode = 'off' | 'filter'

export function limitForHybridSearchMode(mode: HybridSearchMode): number {
  if (mode === 'preview') return SEARCH_PREVIEW_LIMIT
  if (mode === 'listPicker') return SEARCH_LIST_PICKER_LIMIT
  return SEARCH_BROWSE_LIMIT
}
