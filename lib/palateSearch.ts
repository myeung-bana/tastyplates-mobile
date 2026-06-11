import { palateOptions } from '@/constants/palateOptions'

const REGION_CHILD_SLUGS = new Map(
  palateOptions.map((region) => [region.key, region.children.map((child) => child.key)]),
)

/** True when palate param is empty or means “no filter”. */
export function isNoPalateFilter(palate: string | null | undefined): boolean {
  if (palate == null) return true
  const t = palate.trim().toLowerCase()
  return t.length === 0 || t === 'all'
}

/**
 * Expand a palate route param to cuisine slugs for stats + Palate Sort.
 * Region keys (e.g. `East Asian`) expand to child slugs; cuisine slugs pass through.
 */
export function expandPalateParamToSlugs(palate: string | null | undefined): string[] {
  if (isNoPalateFilter(palate)) return []
  const trimmed = palate!.trim()
  const regionChildren = REGION_CHILD_SLUGS.get(trimmed)
  if (regionChildren?.length) return [...regionChildren]
  return [trimmed.toLowerCase()]
}

/** True when `?palate=` should drive Palate Sort (sort context, not taxonomy filter). */
export function isPalateSortActive(palate: string | null | undefined): boolean {
  return !isNoPalateFilter(palate)
}
