import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@nhost/nhost-js'

import { userNameMaxLimit, userNameMinLimit } from '@/constants/validation'
import { generateDefaultUsername } from '@/services/onboardingService'
import {
  createRestaurantUserProfile,
  tryFetchRestaurantUserById,
} from '@/services/restaurantUserService'

/** Used when sign-up completes without a session (email verification required). */
export const PENDING_VERIFICATION_EMAIL_KEY = 'tastyplates_pending_verification_email_v1'

/** Placeholder username until onboarding step 1 — mirrors web `generateUsernameFromEmail`. */
export function generateUsernameFromEmail(email: string): string {
  let username = email.split('@')[0] ?? 'user'
  username = username.replace(/[^a-zA-Z0-9_]/g, '')
  if (username.length < userNameMinLimit) {
    return generateDefaultUsername()
  }
  if (username.length > userNameMaxLimit) {
    username = username.slice(0, userNameMaxLimit)
  }
  return username
}

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

function isProfileAlreadyExistsError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('409') || lower.includes('profile already exists')
}

async function createInitialProfile(username: string): Promise<void> {
  try {
    await createRestaurantUserProfile({ username, onboarding_complete: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (isProfileAlreadyExistsError(msg)) return
    await createRestaurantUserProfile({
      username: generateDefaultUsername(),
      onboarding_complete: false,
    })
  }
}

/**
 * Ensures a `user_profiles` row exists via `POST restaurant-users/create-restaurant-user`.
 * Requires an active Nhost session (Bearer JWT). Safe to call repeatedly.
 */
export async function ensureRestaurantUserProfile(user: User): Promise<void> {
  if (!user.id) return

  const existing = await tryFetchRestaurantUserById(user.id)
  if (existing) return

  const email = user.email?.trim() ?? ''
  const username = email.length > 0 ? generateUsernameFromEmail(email) : generateDefaultUsername()
  await createInitialProfile(username)
}
