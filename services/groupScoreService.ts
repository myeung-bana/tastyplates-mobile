import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'

export interface GroupScore {
  group_slug: string
  group_name: string
  avg: number | null
  weighted: number | null
  review_count: number
  reviewer_count: number
}

type GroupScoresResponse = Record<string, GroupScore>

/**
 * Group scores for a user's leaf palate slugs (parent cuisine region per restaurant).
 * Returns a map keyed by `restaurant_uuid`.
 */
export async function getGroupScoresForPalates(
  palateSlugs: string[],
  restaurantUuids?: string[],
): Promise<Map<string, GroupScore>> {
  const slugs = [...new Set(palateSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))]
  if (slugs.length === 0) return new Map()

  const params = new URLSearchParams({ palates: slugs.join(',') })
  const uuids = restaurantUuids?.map((u) => u.trim()).filter(Boolean) ?? []
  if (uuids.length > 0) {
    params.set('restaurant_uuids', uuids.join(','))
  }

  const envelope = await tastyplatesFetch<GroupScoresResponse>(
    `restaurants-v2/get-group-scores?${params.toString()}`,
  )
  const data = unwrapEnvelope(envelope)
  const map = new Map<string, GroupScore>()
  for (const [uuid, row] of Object.entries(data ?? {})) {
    map.set(uuid, {
      group_slug: row.group_slug,
      group_name: row.group_name,
      avg: coerceRatingNumber(row.avg),
      weighted: row.weighted != null ? coerceRatingNumber(row.weighted) : null,
      review_count: row.review_count ?? 0,
      reviewer_count: row.reviewer_count ?? 0,
    })
  }
  return map
}

export function lookupGroupScoreByUuid(
  map: Map<string, GroupScore>,
  restaurantUuid: string,
): GroupScore | null {
  return map.get(restaurantUuid) ?? null
}
