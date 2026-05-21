import * as SecureStore from 'expo-secure-store'

const STORAGE_KEY = 'tastyplates_get_started_done'
const VALUE_DONE = '1'

export async function hasCompletedGetStarted(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(STORAGE_KEY)
  return value === VALUE_DONE
}

export async function setGetStartedCompleted(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, VALUE_DONE)
}
