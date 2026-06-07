import { useCallback, useEffect, useState } from 'react'
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from '@/lib/recentSearches'

export function useRecentSearches() {
  const [recents, setRecents] = useState<RecentSearch[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await getRecentSearches()
    setRecents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const add = useCallback(
    async (query: string) => {
      await addRecentSearch(query)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (query: string) => {
      await removeRecentSearch(query)
      await refresh()
    },
    [refresh],
  )

  const clear = useCallback(async () => {
    await clearRecentSearches()
    await refresh()
  }, [refresh])

  return { recents, loading, add, remove, clear, refresh }
}
