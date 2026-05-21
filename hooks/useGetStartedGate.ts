import { useEffect, useState } from 'react'

import { hasCompletedGetStarted } from '@/lib/getStartedIntro'

export type GetStartedGateState = {
  /** False until SecureStore has been read at least once. */
  ready: boolean
  /** True when the user has not completed the intro (show carousel). */
  showIntro: boolean
}

/**
 * Loads persisted get-started completion. Use with tabs layout: keep returning `null` while `ready` is false
 * for unauthenticated users so the redirect order matches auth loading.
 */
export function useGetStartedGate(): GetStartedGateState {
  const [ready, setReady] = useState(false)
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const done = await hasCompletedGetStarted()
        if (!cancelled) {
          setShowIntro(!done)
          setReady(true)
        }
      } catch {
        if (!cancelled) {
          setShowIntro(true)
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { ready, showIntro }
}
