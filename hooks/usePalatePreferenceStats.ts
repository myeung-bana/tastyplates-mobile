import { useEffect, useState } from 'react'

import { isNoPalateFilter } from '@/lib/palateSearch'
import {
  getPreferenceStatsByPalate,
  type PreferenceStat,
} from '@/services/preferenceStatsService'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; map: Map<number, PreferenceStat> }
  | { status: 'error'; message: string }

/**
 * Batch preference stats for list screens when a palate filter is active.
 */
export function usePalatePreferenceStats(palateSlug: string | null | undefined) {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (isNoPalateFilter(palateSlug)) {
      setState({ status: 'idle' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    void getPreferenceStatsByPalate(palateSlug!)
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
  }, [palateSlug])

  const getForRestaurant = (restaurantId: number): PreferenceStat | null => {
    if (state.status !== 'ready') return null
    return state.map.get(restaurantId) ?? null
  }

  return {
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.message : null,
    getForRestaurant,
  }
}
