import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'

import { useAuth } from '@/hooks/useAuth'
import { getReadingState, type ReadingState } from '@/services/readingService'

/**
 * Which personalised-reading card to show (backend-decided). Reloads when the screen regains focus,
 * so closing a reading shows "View your reading" straight away.
 *
 * `restaurantUuid` null = no Tastyplates row yet: guests see Sign in, everyone else Not enough.
 */
export function useReadingCardState(restaurantUuid: string | null): {
  state: ReadingState | null
  reload: () => Promise<void>
} {
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<ReadingState | null>(null)
  const requestRef = useRef(0)

  const reload = useCallback(async () => {
    const request = ++requestRef.current
    if (!restaurantUuid) {
      setState({
        state: isAuthenticated ? 'not_enough' : 'guest',
        reading_id: null,
        updated_at: null,
        circles_review_count: 0,
        min_reviews: 3,
      })
      return
    }
    try {
      const next = await getReadingState(restaurantUuid)
      if (request === requestRef.current) setState(next)
    } catch {
      // Keep the card usable: fall back to the default button; starting will re-check.
      if (request === requestRef.current) {
        setState((prev) => prev ?? { state: isAuthenticated ? 'default' : 'guest', reading_id: null, updated_at: null, circles_review_count: 0, min_reviews: 3 })
      }
    }
  }, [isAuthenticated, restaurantUuid])

  useEffect(() => {
    void reload()
  }, [reload])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  return { state, reload }
}
