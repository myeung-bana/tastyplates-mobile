import { useCallback, useEffect, useState } from 'react'

import {
  fetchUserPublicLists,
  PROFILE_PUBLIC_LISTS_PREVIEW_LIMIT,
  type ProfilePublicListSummary,
} from '@/services/profileUserListsService'

export function useProfilePublicListsPreview(
  ownerId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && Boolean(ownerId)
  const [lists, setLists] = useState<ProfilePublicListSummary[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!ownerId) {
      setLists([])
      setTotal(0)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchUserPublicLists(ownerId, {
        limit: PROFILE_PUBLIC_LISTS_PREVIEW_LIMIT,
        offset: 0,
      })
      setLists(result.lists)
      setTotal(result.meta.total)
      setError(null)
    } catch {
      setLists([])
      setTotal(0)
      setError('Could not load lists.')
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  return { lists, total, error, loading, refresh }
}
