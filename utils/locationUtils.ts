import type { SavedLocationPreference } from '@/constants/locations'
import type { LocationCountryNode } from '@/services/onboardingService'

/** Country ISO / short label for a city slug (aligned with web LocationButton). */
export function getParentCountryShortLabel(
  cityKey: string,
  countries: LocationCountryNode[] | null | undefined,
): string {
  const k = cityKey.trim().toLowerCase()
  if (!k || !countries?.length) return ''
  for (const country of countries) {
    const hit = country.cities.find((c) => c.key.trim().toLowerCase() === k)
    if (hit) return country.shortLabel.trim()
  }
  return ''
}

/** "City, AB" subtitle for maps / discovery (saved pref may already carry {@link SavedLocationPreference.countryShortLabel}). */
export function formatLocationDisplay(
  pref: SavedLocationPreference,
  hierarchyCountries?: LocationCountryNode[] | null,
): string {
  const fallbackCc =
    pref.countryShortLabel?.trim() ||
    (hierarchyCountries?.length
      ? getParentCountryShortLabel(pref.key, hierarchyCountries)
      : '')
  const label = pref.label.trim() || pref.key
  return fallbackCc ? `${label}, ${fallbackCc}` : label
}

export function findCountryForCityKey(
  countries: LocationCountryNode[] | null | undefined,
  parentCountryKeyOrCityParentKey: string,
): LocationCountryNode | undefined {
  const pk = parentCountryKeyOrCityParentKey.trim().toLowerCase()
  if (!pk || !countries?.length) return undefined
  return countries.find((c) => c.key.trim().toLowerCase() === pk)
}
