import type { Router } from 'expo-router'
import type { User } from '@nhost/nhost-js'

import {
  SCREEN_HOME,
  SCREEN_USER_VERIFICATION,
} from '@/constants/screens'

import type { TypedResumeHref } from '@/lib/authRoutes'
import { clearGuestBrowseEnabled } from '@/lib/guestBrowse'
import {
  clearPendingVerificationEmail,
  ensureRestaurantUserProfile,
  loadPendingVerificationEmail,
  storePendingVerificationEmail,
} from '@/lib/authProfileSetup'

/**
 * After sign-in / sign-up, send the user to the correct screen.
 * Uses Nhost `needsEmailVerification`. Onboarding completion is enforced by {@link OnboardingGate}
 * from `user_profiles.onboarding_complete`.
 */
export async function navigateAfterAuth(
  router: Router,
  options: {
    needsEmailVerification: boolean
    user: User | null
    /** Sign-up / sign-in email when session may be absent until verification. */
    verificationEmail?: string
  },
  /** Deep link resume when auth is fully complete (skipped for verification redirects). */
  resumeHref?: TypedResumeHref,
): Promise<void> {
  const { needsEmailVerification, user, verificationEmail } = options

  if (needsEmailVerification || (user && !user.emailVerified)) {
    const trimmedVerification = verificationEmail?.trim()
    if (trimmedVerification) {
      await storePendingVerificationEmail(trimmedVerification)
    }

    const pendingEmail = await loadPendingVerificationEmail()
    const email = user?.email?.trim() || pendingEmail || trimmedVerification || undefined
    if (email) {
      router.replace({ pathname: SCREEN_USER_VERIFICATION, params: { email } })
    } else {
      router.replace(SCREEN_USER_VERIFICATION)
    }
    return
  }

  if (user) {
    try {
      await ensureRestaurantUserProfile(user)
      await clearPendingVerificationEmail()
    } catch {
      // Non-blocking — OnboardingGate / onboarding step 3 can retry profile creation.
    }
  }

  await clearGuestBrowseEnabled()

  const target = resumeHref ?? SCREEN_HOME
  router.replace(target)
}
