import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@nhost/nhost-js'

import { ensureRestaurantUserProfileApi } from '@/services/restaurantUserService'

/** Used when sign-up completes without a session (email verification required). */
export const PENDING_VERIFICATION_EMAIL_KEY = 'tastyplates_pending_verification_email_v1'

export async function storePendingVerificationEmail(email: string): Promise<void> {
  const trimmed = email.trim()
  if (!trimmed) return
  await AsyncStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, trimmed)
}

export async function loadPendingVerificationEmail(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY)
  const trimmed = raw?.trim()
  return trimmed?.length ? trimmed : null
}

export async function clearPendingVerificationEmail(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
}

/**
 * Ensures a `user_profiles` row exists via `POST restaurant-users/ensure-profile`.
 * Server assigns `user_<random>` when creating. Requires an active Nhost session.
 */
export async function ensureRestaurantUserProfile(user: User): Promise<void> {
  if (!user.id) return
  await ensureRestaurantUserProfileApi()
}
