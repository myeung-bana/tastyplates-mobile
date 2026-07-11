/** Overlay live preview — fewer rows for faster response. */
export const SEARCH_PREVIEW_LIMIT = 12

/** Restaurants tab committed search page size. */
export const SEARCH_BROWSE_LIMIT = 24

/** List picker / add-to-list hybrid search page size. */
export const SEARCH_LIST_PICKER_LIMIT = 20

/** Target first-page size — Google backfills when TP count is below this. */
export const TARGET_BROWSE_PAGE_SIZE = SEARCH_BROWSE_LIMIT

/** Max Google rows appended per Explore / search merge. */
export const GOOGLE_GAP_FILL_MAX = 20

/** Max Google rows for overlay preview and list-picker flows. */
export const GOOGLE_GAP_FILL_MAX_PICKER = 10

/** Google Nearby Search pages to fetch (API allows up to 3; 2 balances volume vs latency). */
export const GOOGLE_NEARBY_MAX_PAGES = 2

/** Hard cap on raw Nearby results parsed before merge dedupe. */
export const GOOGLE_NEARBY_MAX_RESULTS = 20

/** @deprecated Use {@link GOOGLE_GAP_FILL_MAX_PICKER} + gap-fill merge. */
export const MERGE_GOOGLE_LIMIT_SEARCH = 6

/** @deprecated Use {@link TARGET_BROWSE_PAGE_SIZE} gap-fill instead. */
export const MERGE_SUPPRESS_TP_COUNT_SEARCH = 24

/** @deprecated Use {@link GOOGLE_GAP_FILL_MAX_PICKER}. */
export const MERGE_GOOGLE_LIMIT_IDLE = 10

/** @deprecated Use {@link TARGET_BROWSE_PAGE_SIZE} gap-fill instead. */
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

export function googleGapFillMaxForMode(mode: HybridSearchMode): number {
  if (mode === 'browse') return GOOGLE_GAP_FILL_MAX
  return GOOGLE_GAP_FILL_MAX_PICKER
}
