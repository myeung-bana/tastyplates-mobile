import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'tp:recent_searches_v1'
const MAX = 5

/** What the search opened — decides the label on recents and where a tap goes. */
export type RecentSearchKind = 'keyword' | 'cuisine' | 'category' | 'restaurant'

export interface RecentSearch {
  /** Display text (keyword, cuisine label, restaurant name). */
  query: string
  timestamp: number
  /** Missing on entries written before kinds existed — treated as `keyword`. */
  kind?: RecentSearchKind
  /** Cuisine / category slug, restaurant slug or `google:<place_id>`. */
  value?: string
}

export type RecentSearchInput = Omit<RecentSearch, 'timestamp'>

export function recentKindLabel(kind: RecentSearchKind | undefined): string {
  switch (kind) {
    case 'cuisine':
      return 'Cuisine'
    case 'category':
      return 'Category'
    case 'restaurant':
      return 'Restaurant'
    default:
      return 'Keyword'
  }
}

function sameEntry(a: RecentSearch, b: RecentSearchInput): boolean {
  return (a.kind ?? 'keyword') === (b.kind ?? 'keyword') && a.query.toLowerCase() === b.query.toLowerCase()
}

export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentSearch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Accepts a bare keyword (legacy callers) or a typed entry. Newest first, deduped, capped at 5. */
export async function addRecentSearch(input: string | RecentSearchInput): Promise<void> {
  const entry: RecentSearchInput = typeof input === 'string' ? { query: input, kind: 'keyword' } : input
  const trimmed = entry.query.trim()
  if (!trimmed) return
  try {
    const existing = await getRecentSearches()
    const next: RecentSearch = { ...entry, query: trimmed, timestamp: Date.now() }
    const updated = [next, ...existing.filter((r) => !sameEntry(r, next))].slice(0, MAX)
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // non-critical
  }
}

export async function removeRecentSearch(entry: Pick<RecentSearch, 'query' | 'kind'>): Promise<void> {
  try {
    const existing = await getRecentSearches()
    const updated = existing.filter((r) => !sameEntry(r, entry))
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // non-critical
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // non-critical
  }
}
