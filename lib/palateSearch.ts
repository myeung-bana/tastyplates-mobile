import { palateOptions } from '@/constants/palateOptions'

const REGION_CHILD_SLUGS = new Map(
  palateOptions.map((region) => [region.key, region.children.map((child) => child.key)]),
)

/** True when cuisine param is empty or means “no filter”. */
export function isNoCuisineFilter(cuisine: string | null | undefined): boolean {
  if (cuisine == null) return true
  const t = cuisine.trim().toLowerCase()
  return t.length === 0 || t === 'all'
}

/**
 * Expand a cuisine route param to slug list for `cuisine_slugs`.
 * Region keys (e.g. `East Asian`) expand to child slugs; cuisine slugs pass through.
 */
export function expandCuisineParamToSlugs(cuisine: string | null | undefined): string[] {
  if (isNoCuisineFilter(cuisine)) return []
  const trimmed = cuisine!.trim()
  const regionChildren = REGION_CHILD_SLUGS.get(trimmed)
  if (regionChildren?.length) return [...regionChildren]
  return [trimmed.toLowerCase()]
}

/** Read `?cuisine=` with legacy `?palate=` fallback. */
export function readCuisineParam(params: {
  cuisine?: string | string[] | null
  palate?: string | string[] | null
}): string | null {
  const raw = params.cuisine ?? params.palate
  if (raw == null) return null
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value?.trim() || isNoCuisineFilter(value)) return null
  return value.trim()
}

export function isCuisineFilterActive(cuisine: string | null | undefined): boolean {
  return !isNoCuisineFilter(cuisine)
}

/** @deprecated Use {@link isNoCuisineFilter}. */
export function isNoPalateFilter(palate: string | null | undefined): boolean {
  return isNoCuisineFilter(palate)
}

/** @deprecated Use {@link expandCuisineParamToSlugs}. */
export function expandPalateParamToSlugs(palate: string | null | undefined): string[] {
  return expandCuisineParamToSlugs(palate)
}

/** @deprecated Cuisine browse uses filter + personalised rank — not palate sort. */
export function isPalateSortActive(palate: string | null | undefined): boolean {
  return !isNoCuisineFilter(palate)
}
