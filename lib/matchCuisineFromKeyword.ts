import { palateOptions } from '@/constants/palateOptions'
import { QUICK_FINDS } from '@/constants/quickFinds'

export type CuisineKeywordMatch = {
  slug: string
  label: string
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ')
}

function buildCuisineEntries(): CuisineKeywordMatch[] {
  const seen = new Set<string>()
  const entries: CuisineKeywordMatch[] = []

  const add = (slug: string, label: string) => {
    const key = slug.trim().toLowerCase()
    if (!key.length || seen.has(key)) return
    seen.add(key)
    entries.push({ slug, label })
  }

  for (const region of palateOptions) {
    add(region.key, region.label)
    for (const child of region.children) {
      add(child.key, child.label)
    }
  }

  for (const item of QUICK_FINDS) {
    add(item.slug, item.label)
  }

  return entries
}

const CUISINE_ENTRIES = buildCuisineEntries()

/**
 * When a search keyword resembles a cuisine name, return a browse shortcut target.
 * Supports exact and prefix matches (prefix requires ≥3 characters).
 */
export function matchCuisineFromKeyword(keyword: string): CuisineKeywordMatch | null {
  const query = normalizeToken(keyword)
  if (query.length < 2) return null

  for (const entry of CUISINE_ENTRIES) {
    if (normalizeToken(entry.label) === query) return entry
    if (normalizeToken(entry.slug) === query) return entry
  }

  if (query.length < 3) return null

  const prefixMatches = CUISINE_ENTRIES.filter((entry) =>
    normalizeToken(entry.label).startsWith(query),
  )

  if (prefixMatches.length === 0) return null
  if (prefixMatches.length === 1) return prefixMatches[0]

  return [...prefixMatches].sort((a, b) => a.label.length - b.label.length)[0] ?? null
}
