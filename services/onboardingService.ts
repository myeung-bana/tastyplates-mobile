import AsyncStorage from '@react-native-async-storage/async-storage'

import type { SavedLocationPreference } from '@/constants/locations'
import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { RestaurantUserRow } from '@/services/restaurantUserService'

/** Draft onboarding fields between steps (AsyncStorage). */
export const ONBOARDING_REGISTRATION_KEY = 'tastyplates_onboarding_registration_v1'

/** Skip one onboarding-gate fetch after successful completion. */
export const ONBOARDING_JUST_COMPLETED_KEY = 'tastyplates_onboarding_just_completed_v1'

export type OnboardingRegistrationDraft = {
  username?: string
  location_key?: string
  location_label?: string
}

/** Nhost `locations/get-locations` city node. */
export interface LocationCityNode {
  key: string
  label: string
  shortLabel: string
  flag: string
  currency: string
  timezone: string
  type: 'city'
  parentKey: string
  coordinates: { lat: number; lng: number }
}

export interface LocationCountryNode {
  key: string
  label: string
  shortLabel: string
  flag: string
  currency: string
  timezone: string
  type: 'country'
  cities: LocationCityNode[]
}

export interface GetLocationsData {
  hierarchy: { countries: LocationCountryNode[] }
  flatList: (LocationCountryNode | LocationCityNode)[]
}

export async function fetchLocationHierarchy(): Promise<GetLocationsData> {
  const envelope = await tastyplatesFetch<GetLocationsData>('locations/get-locations')
  return unwrapEnvelope(envelope)
}

export interface CheckUsernameData {
  available: boolean
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const q = new URLSearchParams({ username: username.trim() })
  const envelope = await tastyplatesFetch<CheckUsernameData>(
    `restaurant-users/check-username?${q.toString()}`,
  )
  const data = unwrapEnvelope(envelope)
  return data.available === true
}

export interface UpdateRestaurantUserResponse {
  user: RestaurantUserRow
}

/**
 * Complete onboarding: username, palate slugs, flag. Requires JWT.
 * Palates stored as JSON array of cuisine slug strings (see `palateOptions` keys).
 */
export async function completeOnboardingProfile(params: {
  username: string
  palates: string[]
}): Promise<void> {
  const envelope = await tastyplatesFetch<UpdateRestaurantUserResponse>(
    'restaurant-users/update-restaurant-user',
    {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify({
        username: params.username.trim(),
        palates: params.palates,
        onboarding_complete: true,
      }),
    },
  )
  unwrapEnvelope(envelope)
}

export function generateDefaultUsername(): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `foodie${n}`
}

/** Map Nhost location city node → persisted {@link SavedLocationPreference}. */
export function cityNodeToSavedLocation(
  city: LocationCityNode,
  country?: LocationCountryNode | null,
): SavedLocationPreference {
  const lat = city.coordinates.lat
  const lng = city.coordinates.lng
  const hasCoords = !(lat === 0 && lng === 0)
  const parent = country ?? null
  return {
    key: city.key.trim().toLowerCase(),
    label: city.label,
    coordinates: hasCoords ? { latitude: lat, longitude: lng } : undefined,
    flag: city.flag?.trim()?.length ? city.flag.trim() : parent?.flag?.trim(),
    currency: city.currency ?? parent?.currency,
    timezone: city.timezone ?? parent?.timezone,
    parentCountryKey: parent?.key?.trim().toLowerCase() ?? city.parentKey?.trim().toLowerCase(),
    countryShortLabel: parent?.shortLabel?.trim(),
  }
}

export async function loadOnboardingDraft(): Promise<OnboardingRegistrationDraft> {
  const raw = await AsyncStorage.getItem(ONBOARDING_REGISTRATION_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null || typeof parsed !== 'object') return {}
    return parsed as OnboardingRegistrationDraft
  } catch {
    return {}
  }
}

export async function mergeOnboardingDraft(
  partial: Partial<OnboardingRegistrationDraft>,
): Promise<void> {
  const prev = await loadOnboardingDraft()
  await AsyncStorage.setItem(
    ONBOARDING_REGISTRATION_KEY,
    JSON.stringify({ ...prev, ...partial }),
  )
}

export async function clearOnboardingDraft(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_REGISTRATION_KEY)
}

/** Call after step 3 success so the gate can skip one duplicate profile fetch. */
export async function setOnboardingJustCompletedFlag(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_JUST_COMPLETED_KEY, '1')
}

/**
 * If the user just finished onboarding, clears the flag and returns true (skip gate fetch once).
 */
export async function consumeOnboardingJustCompletedFlag(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ONBOARDING_JUST_COMPLETED_KEY)
  if (v === '1') {
    await AsyncStorage.removeItem(ONBOARDING_JUST_COMPLETED_KEY)
    return true
  }
  return false
}

export function findCityInHierarchy(
  data: GetLocationsData | null | undefined,
  cityKey: string,
): LocationCityNode | undefined {
  const k = cityKey.trim().toLowerCase()
  if (!data?.hierarchy?.countries?.length || !k) return undefined
  for (const country of data.hierarchy.countries) {
    for (const city of country.cities) {
      if (city.key.trim().toLowerCase() === k) return city
    }
  }
  return undefined
}

/** Merge CMS hierarchy metadata onto a persisted preference when the slug matches an active city. */
export function enrichSavedLocationFromHierarchy(
  pref: SavedLocationPreference,
  data: GetLocationsData | null,
): SavedLocationPreference {
  if (!data?.hierarchy?.countries?.length) return pref
  const city = findCityInHierarchy(data, pref.key)
  if (!city) return pref
  const country = data.hierarchy.countries.find((c) => c.key === city.parentKey)
  const fromApi = cityNodeToSavedLocation(city, country)
  return {
    ...pref,
    ...fromApi,
    label: pref.label?.trim()?.length ? pref.label : fromApi.label,
    coordinates: fromApi.coordinates ?? pref.coordinates,
  }
}
