/**
 * Shared domain types and utility type helpers.
 */

export type { Connection, PageInfo, AggregateResponse, Nullable, UUID, Timestamptz, Numeric, Jsonb } from './graphql'

/** Price range tier — maps to $ / $$ / $$$ / $$$$ */
export type PriceRange = 1 | 2 | 3 | 4

/** Review rating — integer 1–5 */
export type Rating = 1 | 2 | 3 | 4 | 5

/** Auth status returned by NhostProvider. */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/** Upload status used by UploadContext. */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/** Haptic feedback style. */
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

/** Brand primary color (use as a constant, not in Tailwind classes). */
export const BRAND_PRIMARY = '#ff7c0a' as const

/** Default feed page size for cursor pagination. */
export const FEED_PAGE_SIZE = 16 as const

/** Default grid page size for cursor pagination. */
export const GRID_PAGE_SIZE = 8 as const
