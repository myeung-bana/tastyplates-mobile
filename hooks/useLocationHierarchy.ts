import { useCallback, useEffect, useState } from 'react'

import { fetchLocationHierarchy, type GetLocationsData } from '@/services/onboardingService'

export function useLocationHierarchy(enabled = true): {
  hierarchy: GetLocationsData | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [hierarchy, setHierarchy] = useState<GetLocationsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    void fetchLocationHierarchy()
      .then((data) => {
        setHierarchy(data)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not load cities')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [enabled])

  useEffect(() => {
    reload()
  }, [reload])

  return { hierarchy, loading, error, reload }
}
