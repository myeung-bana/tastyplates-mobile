import type { Router } from 'expo-router'
import type { User } from '@nhost/nhost-js'

import {
  SCREEN_HOME,
  SCREEN_ONBOARDING,
  SCREEN_USER_VERIFICATION,
} from '@/constants/screens'

function isOnboardingComplete(user: User | null): boolean {
  if (!user?.metadata || typeof user.metadata !== 'object') return false
  const m = user.metadata as Record<string, unknown>
  return Boolean(m.onboardingCompleted)
}

/**
 * After sign-in / sign-up, send the user to the correct screen.
 * Uses Nhost `needsEmailVerification` and optional `metadata.onboardingCompleted`.
 */
export function navigateAfterAuth(
  router: Router,
  options: {
    needsEmailVerification: boolean
    user: User | null
  },
): void {
  const { needsEmailVerification, user } = options

  if (needsEmailVerification) {
    router.replace(SCREEN_USER_VERIFICATION)
    return
  }

  if (user && !user.emailVerified) {
    router.replace(SCREEN_USER_VERIFICATION)
    return
  }

  if (user && !isOnboardingComplete(user)) {
    router.replace(SCREEN_ONBOARDING)
    return
  }

  router.replace(SCREEN_HOME)
}
