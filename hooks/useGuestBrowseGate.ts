import { useCallback, useEffect, useState } from 'react'

import { hasGuestBrowseEnabled } from '@/lib/guestBrowse'

export type GuestBrowseGateState = {
  ready: boolean
  enabled: boolean
  reload: () => void
}

/**
 * Loads persisted guest-browse flag. Use with {@link useGetStartedGate} before routing unauthenticated users.
 */
export function useGuestBrowseGate(): GuestBrowseGateState {
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(false)

  const reload = useCallback(() => {
    setReady(false)
    void (async () => {
      try {
        const on = await hasGuestBrowseEnabled()
        setEnabled(on)
      } catch {
        setEnabled(false)
      } finally {
        setReady(true)
      }
    })()
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { ready, enabled, reload }
}
