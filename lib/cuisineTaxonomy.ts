import { palateOptions, type PalateRegion } from '@/constants/palateOptions'
import { expandCuisineParamToSlugs, isNoCuisineFilter } from '@/lib/palateSearch'

const REGION_BY_KEY = new Map<string, PalateRegion>(
  palateOptions.map((region) => [region.key, region]),
)

const CUISINE_TO_REGION = new Map<string, PalateRegion>()
for (const region of palateOptions) {
  for (const child of region.children) {
    CUISINE_TO_REGION.set(child.key.toLowerCase(), region)
  }
}

export function isCuisineRegionKey(key: string | null | undefined): boolean {
  if (!key?.trim()) return false
  return REGION_BY_KEY.has(key.trim())
}

/** Parent region for a cuisine slug, e.g. `japanese` → East Asian. */
export function getParentRegion(cuisineSlug: string): PalateRegion | null {
  return CUISINE_TO_REGION.get(cuisineSlug.trim().toLowerCase()) ?? null
}

/**
 * Siblings of the selected cuisine (same region, excluding the cuisine itself)
 * that intersect the user's palate. Falls back to the user's own cuisine when
 * they browse their own cuisine slug.
 */
export function computeTrustSet(selectedCuisine: string, userPalate: string[]): string[] {
  const selected = selectedCuisine.trim().toLowerCase()
  const region = getParentRegion(selected)
  if (!region) return []

  const userPalateSet = new Set(userPalate.map((p) => p.trim().toLowerCase()).filter(Boolean))
  const siblings = region.children
    .map((c) => c.key.toLowerCase())
    .filter((key) => key !== selected)

  const intersection = siblings.filter((slug) => userPalateSet.has(slug))
  if (intersection.length > 0) return intersection

  if (userPalateSet.has(selected)) return [selected]
  return []
}

/** User palate slugs that belong to a selected region pill. */
export function computeTrustSetForRegion(regionKey: string, userPalate: string[]): string[] {
  const region = REGION_BY_KEY.get(regionKey.trim())
  if (!region) return []

  const userPalateSet = new Set(userPalate.map((p) => p.trim().toLowerCase()).filter(Boolean))
  return region.children.map((c) => c.key.toLowerCase()).filter((slug) => userPalateSet.has(slug))
}

export function canPersonaliseRanking(
  cuisineParam: string | null | undefined,
  userPalate: string[] | null | undefined,
): boolean {
  if (!cuisineParam || isNoCuisineFilter(cuisineParam) || !userPalate?.length) return false
  return resolveTrustSet({ cuisineParam, userPalate }).length > 0
}

export function resolveTrustSet(options: {
  cuisineParam: string | null | undefined
  userPalate: string[] | null | undefined
}): string[] {
  const { cuisineParam, userPalate } = options
  if (!cuisineParam || isNoCuisineFilter(cuisineParam) || !userPalate?.length) return []

  const trimmed = cuisineParam.trim()
  if (isCuisineRegionKey(trimmed)) {
    return computeTrustSetForRegion(trimmed, userPalate)
  }

  const expanded = expandCuisineParamToSlugs(trimmed)
  if (expanded.length === 1) {
    return computeTrustSet(expanded[0]!, userPalate)
  }

  return computeTrustSetForRegion(trimmed, userPalate)
}
