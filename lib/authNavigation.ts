import type { Router } from 'expo-router'
import type { User } from '@nhost/nhost-js'

import {
  SCREEN_HOME,
  SCREEN_USER_VERIFICATION,
} from '@/constants/screens'

import type { TypedResumeHref } from '@/lib/authRoutes'

/**
 * After sign-in / sign-up, send the user to the correct screen.
 * Uses Nhost `needsEmailVerification`. Onboarding completion is enforced by {@link OnboardingGate}
 * from `user_profiles.onboarding_complete`.
 */
export function navigateAfterAuth(
  router: Router,
  options: {
    needsEmailVerification: boolean
    user: User | null
  },
  /** Deep link resume when auth is fully complete (skipped for verification redirects). */
  resumeHref?: TypedResumeHref,
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

  const target = resumeHref ?? SCREEN_HOME
  router.replace(target)
}
