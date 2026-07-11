import { RESTAURANT_PARENT_CATEGORIES } from '@/constants/restaurantCategories'

export type CategoryKeywordMatch = {
  slug: string
  label: string
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ')
}

const CATEGORY_ENTRIES: CategoryKeywordMatch[] = RESTAURANT_PARENT_CATEGORIES.map((entry) => ({
  slug: entry.slug,
  label: entry.label,
}))

/**
 * When a search keyword resembles a parent category name, return a browse shortcut target.
 * Supports exact and prefix matches (prefix requires ≥3 characters).
 */
export function matchCategoryFromKeyword(keyword: string): CategoryKeywordMatch | null {
  const query = normalizeToken(keyword)
  if (query.length < 2) return null

  for (const entry of CATEGORY_ENTRIES) {
    if (normalizeToken(entry.label) === query) return entry
    if (normalizeToken(entry.slug) === query) return entry
  }

  if (query.length < 3) return null

  const prefixMatches = CATEGORY_ENTRIES.filter((entry) =>
    normalizeToken(entry.label).startsWith(query),
  )

  if (prefixMatches.length === 0) return null
  if (prefixMatches.length === 1) return prefixMatches[0]

  return [...prefixMatches].sort((a, b) => a.label.length - b.label.length)[0] ?? null
}
