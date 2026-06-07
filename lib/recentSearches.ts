import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'tp:recent_searches_v1'
const MAX = 5

export interface RecentSearch {
  query: string
  timestamp: number
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

export async function addRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim()
  if (!trimmed) return
  try {
    const existing = await getRecentSearches()
    const deduped = existing.filter(
      (r) => r.query.toLowerCase() !== trimmed.toLowerCase(),
    )
    const updated: RecentSearch[] = [
      { query: trimmed, timestamp: Date.now() },
      ...deduped,
    ].slice(0, MAX)
    await AsyncStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // non-critical
  }
}

export async function removeRecentSearch(query: string): Promise<void> {
  try {
    const existing = await getRecentSearches()
    const updated = existing.filter((r) => r.query !== query)
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
