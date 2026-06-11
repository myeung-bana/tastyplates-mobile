import { expandPalateParamToSlugs } from '@/lib/palateSearch'
import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'

export interface PreferenceStat {
  avg: number | null
  count: number
}

type PreferenceStatsResponse = Record<string, { avg: number; count: number }>

/**
 * Preference / Search scores for a palate slug set (reviewer-profile matching via Nhost).
 * Returns a map keyed by `restaurant_uuid`.
 */
export async function getPreferenceStatsForPalates(
  palateSlugs: string[],
): Promise<Map<string, PreferenceStat>> {
  const slugs = [...new Set(palateSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))]
  if (slugs.length === 0) return new Map()

  const envelope = await tastyplatesFetch<PreferenceStatsResponse>(
    `restaurants-v2/get-preference-stats?palates=${encodeURIComponent(slugs.join(','))}`,
  )
  const data = unwrapEnvelope(envelope)
  const map = new Map<string, PreferenceStat>()
  for (const [uuid, row] of Object.entries(data ?? {})) {
    map.set(uuid, {
      avg: coerceRatingNumber(row.avg),
      count: row.count ?? 0,
    })
  }
  return map
}

/** Expand a route param (cuisine slug or region key) then fetch preference stats. */
export async function getPreferenceStatsByPalateParam(
  palateParam: string,
): Promise<Map<string, PreferenceStat>> {
  return getPreferenceStatsForPalates(expandPalateParamToSlugs(palateParam))
}

/** @deprecated Use `getPreferenceStatsByPalateParam` — kept for call-site clarity. */
export async function getPreferenceStatsByPalate(
  palateParam: string,
): Promise<Map<string, PreferenceStat>> {
  return getPreferenceStatsByPalateParam(palateParam)
}

export function lookupPreferenceStatByUuid(
  map: Map<string, PreferenceStat>,
  restaurantUuid: string,
): PreferenceStat | null {
  return map.get(restaurantUuid) ?? null
}
