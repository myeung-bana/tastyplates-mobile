import * as SecureStore from 'expo-secure-store'

import { clearGetStartedCompleted, setGetStartedCompleted } from '@/lib/getStartedIntro'

const STORAGE_KEY = 'tastyplates_guest_browse_v1'
const VALUE_ENABLED = '1'

export async function hasGuestBrowseEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(STORAGE_KEY)
  return value === VALUE_ENABLED
}

export async function setGuestBrowseEnabled(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, VALUE_ENABLED)
}

export async function clearGuestBrowseEnabled(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
}

/** Marks intro complete and enables guest tab shell (Home · Restaurants · Profile). */
export async function enterGuestBrowseMode(): Promise<void> {
  await setGetStartedCompleted()
  await setGuestBrowseEnabled()
}

/** Clears guest + intro flags so logout returns to the get-started carousel. */
export async function resetToGetStartedLanding(): Promise<void> {
  await clearGuestBrowseEnabled()
  await clearGetStartedCompleted()
}
