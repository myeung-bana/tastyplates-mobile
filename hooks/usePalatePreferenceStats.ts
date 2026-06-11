import { useEffect, useState } from 'react'

import { isPalateSortActive } from '@/lib/palateSearch'
import {
  getPreferenceStatsByPalateParam,
  type PreferenceStat,
} from '@/services/preferenceStatsService'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; map: Map<string, PreferenceStat> }
  | { status: 'error'; message: string }

/**
 * Batch preference stats for list screens when Palate Sort is active (`?palate=`).
 */
export function usePalatePreferenceStats(palateParam: string | null | undefined) {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!isPalateSortActive(palateParam)) {
      setState({ status: 'idle' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    void getPreferenceStatsByPalateParam(palateParam!)
      .then((map) => {
        if (!cancelled) setState({ status: 'ready', map })
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Failed to load search scores',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [palateParam])

  const statsMap = state.status === 'ready' ? state.map : null

  const getForRestaurantUuid = (restaurantUuid: string | null | undefined): PreferenceStat | null => {
    if (!restaurantUuid?.trim() || state.status !== 'ready') return null
    return state.map.get(restaurantUuid.trim()) ?? null
  }

  return {
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.message : null,
    statsMap,
    getForRestaurantUuid,
  }
}
