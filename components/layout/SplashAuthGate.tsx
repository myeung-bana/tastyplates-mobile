import { useEffect } from 'react'
import { Slot, SplashScreen } from 'expo-router'

import { BrandSplash } from '@/components/layout/BrandSplash'
import { OnboardingGate } from '@/components/layout/OnboardingGate'
import { StudioQuickMenuProvider } from '@/contexts/StudioQuickMenuContext'
import { TabBarScrollProvider } from '@/contexts/TabBarScrollContext'
import { useAuth } from '@/hooks/useAuth'
import { setSentryUser } from '@/lib/sentry'

/**
 * Renders routed content only after Nhost session hydration. The native splash hands over to the
 * brand splash (design G0) as soon as fonts are ready, which stays up until the session resolves.
 */
export function SplashAuthGate(): JSX.Element | null {
  const { loading, user } = useAuth()

  useEffect(() => {
    void SplashScreen.hideAsync()
  }, [])

  useEffect(() => {
    setSentryUser(user?.id ?? null)
  }, [user?.id])

  if (loading) {
    return <BrandSplash />
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
