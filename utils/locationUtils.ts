import type { SavedLocationPreference } from '@/constants/locations'
import type { LocationCountryNode } from '@/services/onboardingService'
import type { UserProfileLocationSnapshot } from '@/services/restaurantUserService'

/** ISO 3166-1 alpha-2 codes (common markets + profile picks). */
const ISO2_CODES = new Set([
  'CA', 'US', 'GB', 'JP', 'KR', 'CN', 'PH', 'SG', 'MY', 'TH', 'VN', 'ID', 'AU', 'NZ',
  'FR', 'DE', 'IT', 'ES', 'MX', 'BR', 'IN', 'NG', 'HK', 'TW',
])

/** ISO 3166-1 alpha-3 → alpha-2 (when CMS or Google returns 3-letter codes). */
const ISO3_TO_ISO2: Record<string, string> = {
  CAN: 'CA',
  USA: 'US',
  GBR: 'GB',
  JPN: 'JP',
  KOR: 'KR',
  CHN: 'CN',
  PHL: 'PH',
  SGP: 'SG',
  MYS: 'MY',
  THA: 'TH',
  VNM: 'VN',
  IDN: 'ID',
  AUS: 'AU',
  NZL: 'NZ',
  FRA: 'FR',
  DEU: 'DE',
  ITA: 'IT',
  ESP: 'ES',
  MEX: 'MX',
  BRA: 'BR',
  IND: 'IN',
  NGA: 'NG',
  HKG: 'HK',
  TWN: 'TW',
}

/** Country names from Google autocomplete → ISO2. */
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  canada: 'CA',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  'south korea': 'KR',
  korea: 'KR',
  japan: 'JP',
  philippines: 'PH',
  singapore: 'SG',
  malaysia: 'MY',
  thailand: 'TH',
  vietnam: 'VN',
  indonesia: 'ID',
  australia: 'AU',
  'new zealand': 'NZ',
  'united kingdom': 'GB',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  spain: 'ES',
  mexico: 'MX',
  brazil: 'BR',
  india: 'IN',
  nigeria: 'NG',
  china: 'CN',
  'hong kong': 'HK',
  taiwan: 'TW',
}

function normalizeCountryCode2(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed.length) return ''
  const upper = trimmed.toUpperCase()
  if (upper.length === 2 && ISO2_CODES.has(upper)) return upper
  if (upper.length === 3 && ISO3_TO_ISO2[upper]) return ISO3_TO_ISO2[upper]
  const fromName = COUNTRY_NAME_TO_ISO2[trimmed.toLowerCase()]
  if (fromName) return fromName
  const letters = upper.replace(/[^A-Z]/g, '')
  return letters.length >= 2 ? letters.slice(0, 2) : upper.slice(0, 2)
}

function formatCityCountryFromLabel(label: string): string {
  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return label.trim()
  if (parts.length === 1) return parts[0]!
  const countryRaw = parts[parts.length - 1]!
  const city = parts.slice(0, -1).join(', ')
  const country = normalizeCountryCode2(countryRaw)
  return country ? `${city}, ${country}` : city
}

/**
 * Profile row: "City, CC" with 2-letter country code (e.g. Seoul, KR).
 */
export function formatProfileLocationCityCountry(
  snapshot: UserProfileLocationSnapshot | null | undefined,
  hierarchyCountries?: LocationCountryNode[] | null,
): string | null {
  const label = snapshot?.label?.trim()
  if (!label) return null

  const slug = snapshot?.slug?.trim().toLowerCase()
  if (slug && hierarchyCountries?.length) {
    for (const country of hierarchyCountries) {
      const city = country.cities.find((c) => c.key.trim().toLowerCase() === slug)
      if (city) {
        const cc = normalizeCountryCode2(country.shortLabel)
        return cc ? `${city.label.trim()}, ${cc}` : city.label.trim()
      }
    }
  }

  return formatCityCountryFromLabel(label)
}

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
