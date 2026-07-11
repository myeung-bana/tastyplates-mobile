import { RESTAURANT_PARENT_CATEGORIES } from '@/constants/restaurantCategories'

const CATEGORY_LABEL_BY_SLUG = new Map(
  RESTAURANT_PARENT_CATEGORIES.map((entry) => [entry.slug, entry.label]),
)

/** True when category param is empty or means “no filter”. */
export function isNoCategoryFilter(category: string | null | undefined): boolean {
  if (category == null) return true
  const t = category.trim().toLowerCase()
  return t.length === 0 || t === 'all'
}

/** Maps a category route param to `category_slugs` query values. */
export function expandCategoryParamToSlugs(category: string | null | undefined): string[] {
  if (isNoCategoryFilter(category)) return []
  return [category!.trim().toLowerCase()]
}

/** Read `?category=` from route params. */
export function readCategoryParam(params: {
  category?: string | string[] | null
}): string | null {
  const raw = params.category
  if (raw == null) return null
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value?.trim() || isNoCategoryFilter(value)) return null
  return value.trim().toLowerCase()
}

export function isCategoryFilterActive(category: string | null | undefined): boolean {
  return !isNoCategoryFilter(category)
}

/** Display label for a category slug on filter chips and headers. */
export function labelForCategoryKey(slug: string | null | undefined): string {
  const key = slug?.trim().toLowerCase()
  if (!key) return 'Category'
  return CATEGORY_LABEL_BY_SLUG.get(key) ?? slug!.trim()
}
