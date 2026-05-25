/**
 * Types for user-curated restaurant playlists.
 * Aligns with the `restaurant-lists/*` Nhost Functions API.
 * See: tastyplates-nhost/functions/_lib/listEnrichment.ts → EnrichedItem
 */

// ── Summary — used by hub / get-my-lists ─────────────────────────────────────

export interface RestaurantListSummary {
  id: number
  uuid: string
  slug: string
  title: string
  description: string | null
  is_public: boolean
  is_active: boolean
  /** Returned only when the caller is the owner */
  share_token?: string
  items_count: number
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

// ── Enriched item — used by list detail ──────────────────────────────────────

export interface RestaurantListItem {
  id: number
  sort_order: number
  restaurant_uuid: string | null
  google_place_id: string | null
  /** Resolved from either restaurants table or google_place_cache */
  name: string | null
  /** Present for TP-linked items; links to the restaurant detail page */
  slug: string | null
  image_url: string | null
  address: string | null
  rating: number | null
}

// ── Detail — list header + items ─────────────────────────────────────────────

export interface RestaurantListDetail {
  id: number
  uuid: string
  slug: string
  title: string
  description: string | null
  is_public: boolean
  is_active: boolean
  share_token?: string
  owner_id: string | null
  owner: { displayName: string | null; avatarUrl: string | null } | null
  created_at: string
  updated_at: string
  items: RestaurantListItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when an item is linked to a TastyPlates listing (has a detail page). */
export function isLinkedItem(item: RestaurantListItem): boolean {
  return item.restaurant_uuid !== null && item.slug !== null
}

/** Display name regardless of item type. */
export function getItemDisplayName(item: RestaurantListItem): string {
  return item.name ?? 'Unknown Restaurant'
}
