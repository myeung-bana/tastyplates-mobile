/**
 * Lightweight city anchor for Places bias + labeling (tasty-studio-v1 LocationContext MVP).
 */

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

const JP_FLAG = 'https://flagcdn.com/jp.svg'

/** Curated presets — enriched for nav pills (same cities as tasty-palate-review Japan defaults). */
export interface SavedLocationPreference {
  /** Stable key aligned with editorial / slug usage (e.g. `tokyo`). */
  key: string
  /** Human-readable label for UI chips. */
  label: string
  coordinates?: LocationCoordinates
  /** Flag image URL (`restaurant_locations` / Nhost). */
  flag?: string | null
  currency?: string | null
  timezone?: string | null
  /** Parent geography key from CMS (country row `key`). */
  parentCountryKey?: string | null
  /** Short label shown after city — e.g. province or country code snippet from CMS. */
  countryShortLabel?: string | null
}

export const DEFAULT_LOCATION_FALLBACK_SLUG =
  process.env.EXPO_PUBLIC_DEFAULT_LOCATION_SLUG?.trim()?.toLowerCase() || 'tokyo'

/** Curated presets — bias only; autocomplete still returns global-ish results closer to coords. */
export const STUDIO_LOCATION_PRESETS: readonly SavedLocationPreference[] = [
  {
    key: 'tokyo',
    label: 'Tokyo',
    coordinates: { latitude: 35.6764, longitude: 139.65 },
    flag: JP_FLAG,
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    parentCountryKey: 'japan',
    countryShortLabel: 'JP',
  },
  {
    key: 'osaka',
    label: 'Osaka',
    coordinates: { latitude: 34.6937, longitude: 135.5023 },
    flag: JP_FLAG,
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    parentCountryKey: 'japan',
    countryShortLabel: 'JP',
  },
  {
    key: 'kyoto',
    label: 'Kyoto',
    coordinates: { latitude: 35.0116, longitude: 135.768 },
    flag: JP_FLAG,
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    parentCountryKey: 'japan',
    countryShortLabel: 'JP',
  },
  {
    key: 'fukuoka',
    label: 'Fukuoka',
    coordinates: { latitude: 33.5904, longitude: 130.4017 },
    flag: JP_FLAG,
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    parentCountryKey: 'japan',
    countryShortLabel: 'JP',
  },
  {
    key: 'sapporo',
    label: 'Sapporo',
    coordinates: { latitude: 43.0642, longitude: 141.3469 },
    flag: JP_FLAG,
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    parentCountryKey: 'japan',
    countryShortLabel: 'JP',
  },
] as const

export function getPresetLocationByKey(key: string): SavedLocationPreference | undefined {
  const k = key.trim().toLowerCase()
  return STUDIO_LOCATION_PRESETS.find((p) => p.key === k)
}

function readOptionalString(raw: Record<string, unknown>, key: string): string | null | undefined {
  const v = raw[key]
  if (v === null) return null
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  return undefined
}

/**
 * Hydrate {@link SavedLocationPreference} from Secure Store JSON.
 * Supports curated {@link STUDIO_LOCATION_PRESETS} and dynamic rows from `locations/get-locations`.
 */
export function parseStoredLocationPreference(raw: unknown): SavedLocationPreference | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const keyRaw = o.key
  if (typeof keyRaw !== 'string' || !keyRaw.trim()) return null
  const key = keyRaw.trim().toLowerCase()

  const label =
    typeof o.label === 'string' && o.label.trim().length > 0 ? o.label.trim() : key

  const c = o.coordinates
  let coordinates: LocationCoordinates | undefined
  if (c && typeof c === 'object') {
    const lat = (c as Record<string, unknown>).latitude
    const lng = (c as Record<string, unknown>).longitude
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      coordinates = { latitude: lat, longitude: lng }
    }
  }

  const flag = readOptionalString(o, 'flag')
  const currency = readOptionalString(o, 'currency')
  const timezone = readOptionalString(o, 'timezone')
  const parentCountryKey = readOptionalString(o, 'parentCountryKey')
  const countryShortLabel = readOptionalString(o, 'countryShortLabel')

  const preset = getPresetLocationByKey(key)

  /** Merge stored dynamic fields onto preset fallback so flags survive upgrades. */
  const base: SavedLocationPreference = preset
    ? {
        ...preset,
        ...(coordinates !== undefined ? { coordinates } : {}),
      }
    : { key, label, coordinates }

  return {
    ...base,
    key,
    label: preset ? preset.label : label,
    coordinates: coordinates ?? base.coordinates,
    flag:
      typeof flag === 'string' ? flag.trim() :
      preset?.flag ??
      undefined,
    currency: typeof currency === 'string' ? currency : preset?.currency ?? base.currency,
    timezone: typeof timezone === 'string' ? timezone : preset?.timezone ?? base.timezone,
    parentCountryKey:
      typeof parentCountryKey === 'string' ?
        parentCountryKey.trim().toLowerCase() :
      preset?.parentCountryKey ??
      undefined,
    countryShortLabel:
      typeof countryShortLabel === 'string' ?
        countryShortLabel.trim() :
      preset?.countryShortLabel ??
      undefined,
  }
}
