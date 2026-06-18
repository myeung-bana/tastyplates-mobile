import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSegments } from 'expo-router'

import { SCREEN_ONBOARDING } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { ensureRestaurantUserProfile } from '@/lib/authProfileSetup'
import { consumeOnboardingJustCompletedFlag } from '@/services/onboardingService'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'

/**
 * After email verification, ensures `user_profiles.onboarding_complete` before tab content.
 * Renders nothing until the check finishes for verified users (avoids a flash of home).
 */
export function OnboardingGate({ children }: { children: ReactNode }): JSX.Element | null {
  const router = useRouter()
  const segments = useSegments()
  const { isAuthenticated, user, loading } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading) {
      return
    }

    if (!isAuthenticated || !user?.id) {
      setReady(true)
      return
    }

    if (!user.emailVerified) {
      setReady(true)
      return
    }

    if (segments[0] === 'onboarding') {
      setReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        if (await consumeOnboardingJustCompletedFlag()) {
          if (!cancelled) setReady(true)
          return
        }

        await ensureRestaurantUserProfile(user)

        const row = await fetchRestaurantUserById(user.id)
        if (cancelled) return
        if (row.onboarding_complete !== true) {
          router.replace(SCREEN_ONBOARDING)
        }
      } catch {
        // Do not block the app on profile fetch errors.
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, loading, router, segments, user])

  if (!ready) {
    return null
  }

  return <>{children}</>
}
