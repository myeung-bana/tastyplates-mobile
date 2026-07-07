import { useEffect } from 'react'
import { Slot, SplashScreen } from 'expo-router'

import { OnboardingGate } from '@/components/layout/OnboardingGate'
import { StudioQuickMenuProvider } from '@/contexts/StudioQuickMenuContext'
import { TabBarScrollProvider } from '@/contexts/TabBarScrollContext'
import { useAuth } from '@/hooks/useAuth'

/**
 * Renders routed content only after Nhost session hydration; keeps native splash visible until then.
 */
export function SplashAuthGate(): JSX.Element | null {
  const { loading } = useAuth()

  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()
  }, [loading])

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
