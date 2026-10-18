import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useSignOut } from '@nhost/react'

import { SCREEN_GET_STARTED, SCREEN_ONBOARDING } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { ensureRestaurantUserProfile } from '@/lib/authProfileSetup'
import { resetToGetStartedLanding } from '@/lib/guestBrowse'
import { consumeOnboardingJustCompletedFlag } from '@/services/onboardingService'
import {
  fetchRestaurantUserById,
  restoreDeletedAccount,
  type AccountDeletionPending,
} from '@/services/restaurantUserService'
import { toast } from '@/utils/toast'

function formatScheduledDate(iso: string | null): string {
  if (!iso) return 'soon'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'soon'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Resolves true when the user restored the account, false when they chose to stay signed out. */
function promptRestoreAccount(deletion: AccountDeletionPending): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Restore your account?',
      `Your account is scheduled for permanent deletion on ${formatScheduledDate(deletion.scheduled_for)}. Restore it to bring back your profile, lists and reviews.`,
      [
        { text: 'Keep deleting', style: 'destructive', onPress: () => resolve(false) },
        { text: 'Restore account', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    )
  })
}

/**
 * After email verification, ensures `user_profiles.onboarding_complete` before tab content.
 * Accounts inside their deletion grace period must restore or sign out first.
 * Renders nothing until the check finishes for verified users (avoids a flash of home).
 */
export function OnboardingGate({ children }: { children: ReactNode }): JSX.Element | null {
  const router = useRouter()
  const segments = useSegments()
  const { isAuthenticated, user, loading } = useAuth()
  const { signOut } = useSignOut()
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

        const deletion = await ensureRestaurantUserProfile(user)
        if (cancelled) return
        if (deletion?.pending) {
          const restore = await promptRestoreAccount(deletion)
          if (cancelled) return
          if (!restore) {
            await resetToGetStartedLanding()
            router.replace(SCREEN_GET_STARTED)
            await signOut()
            return
          }
          await restoreDeletedAccount()
          toast.success('Welcome back — your account has been restored.')
        }

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
  }, [isAuthenticated, loading, router, segments, signOut, user])

  if (!ready) {
    return null
  }

  return <>{children}</>
}
