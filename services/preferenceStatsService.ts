import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export interface PreferenceStatRow {
  restaurant_id: number
  cuisine_id: number
  preference_rating_avg: number | null
  preference_review_count: number
}

export interface PreferenceStat {
  avg: number | null
  count: number
}

/**
 * Preference / Search scores for one palate slug (`restaurant_cuisine_rating_summary`).
 */
export async function getPreferenceStatsByPalate(
  palateSlug: string,
): Promise<Map<number, PreferenceStat>> {
  const slug = palateSlug.trim()
  if (!slug) return new Map()

  const envelope = await tastyplatesFetch<PreferenceStatRow[]>(
    `restaurants-v2/get-preference-stats?palate_slug=${encodeURIComponent(slug)}`,
  )
  const rows = unwrapEnvelope(envelope)
  const map = new Map<number, PreferenceStat>()
  for (const row of rows) {
    map.set(row.restaurant_id, {
      avg: row.preference_rating_avg,
      count: row.preference_review_count ?? 0,
    })
  }
  return map
}

export function lookupPreferenceStat(
  map: Map<number, PreferenceStat>,
  restaurantId: number,
): PreferenceStat | null {
  return map.get(restaurantId) ?? null
}
