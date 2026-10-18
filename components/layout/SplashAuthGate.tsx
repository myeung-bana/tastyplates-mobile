import { useEffect } from 'react'
import { Slot, SplashScreen } from 'expo-router'

import { OnboardingGate } from '@/components/layout/OnboardingGate'
import { StudioQuickMenuProvider } from '@/contexts/StudioQuickMenuContext'
import { TabBarScrollProvider } from '@/contexts/TabBarScrollContext'
import { useAuth } from '@/hooks/useAuth'
import { setSentryUser } from '@/lib/sentry'

/**
 * Renders routed content only after Nhost session hydration; keeps native splash visible until then.
 */
export function SplashAuthGate(): JSX.Element | null {
  const { loading, user } = useAuth()

  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()
  }, [loading])

  useEffect(() => {
    setSentryUser(user?.id ?? null)
  }, [user?.id])

  if (loading) {
    return null
  }

  return (
    <TabBarScrollProvider>
      <StudioQuickMenuProvider>
        <OnboardingGate>
          <Slot />
        </OnboardingGate>
      </StudioQuickMenuProvider>
    </TabBarScrollProvider>
  )
}
