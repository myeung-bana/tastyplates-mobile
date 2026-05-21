import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import * as SecureStore from 'expo-secure-store'

import type { SavedLocationPreference } from '@/constants/locations'
import {
  DEFAULT_LOCATION_FALLBACK_SLUG,
  getPresetLocationByKey,
  parseStoredLocationPreference,
} from '@/constants/locations'
import {
  cityNodeToSavedLocation,
  enrichSavedLocationFromHierarchy,
  fetchLocationHierarchy,
  findCityInHierarchy,
  type GetLocationsData,
} from '@/services/onboardingService'

const STORAGE_KEY = 'tastyplates_mobile_location_prefs_v1'

function serializePreference(pref: SavedLocationPreference): string {
  const obj: Record<string, unknown> = {
    key: pref.key.trim().toLowerCase(),
    label: pref.label,
  }
  if (pref.coordinates) obj.coordinates = pref.coordinates
  if (pref.flag?.trim()?.length) obj.flag = pref.flag.trim()
  if (pref.currency?.trim()?.length) obj.currency = pref.currency.trim()
  if (pref.timezone?.trim()?.length) obj.timezone = pref.timezone.trim()
  if (pref.parentCountryKey?.trim()?.length) obj.parentCountryKey = pref.parentCountryKey.trim()
  if (pref.countryShortLabel?.trim()?.length) obj.countryShortLabel = pref.countryShortLabel.trim()
  return JSON.stringify(obj)
}

export type LocationContextValue = {
  location: SavedLocationPreference
  hierarchy: GetLocationsData | null
  hierarchyLoading: boolean
  hierarchyError: string | null
  reloadHierarchy: () => void
  setLocationByKey: (key: string) => void
  /** Set preference (preset or CMS city row). Merges hierarchy metadata when CMS data is loaded. */
  setLocationPreference: (pref: SavedLocationPreference) => void
  ready: boolean
  /** Bumps whenever UI should present the hierarchy picker ({@link LocationHierarchyPickerHost}). */
  locationPickerSignal: number
  openLocationPicker: () => void
  closeLocationPicker: () => void
}

const LocationContext = createContext<LocationContextValue | null>(null)

function resolveInitialLocation(prefKey: string | null): SavedLocationPreference {
  if (prefKey?.length) {
    const preset = getPresetLocationByKey(prefKey)
    if (preset) return preset
  }
  const fromEnv =
    DEFAULT_LOCATION_FALLBACK_SLUG.length > 0
      ? getPresetLocationByKey(DEFAULT_LOCATION_FALLBACK_SLUG)
      : undefined
  return (
    fromEnv ?? {
      key: 'tokyo',
      label: 'Tokyo',
      coordinates: { latitude: 35.6764, longitude: 139.65 },
      flag: 'https://flagcdn.com/jp.svg',
      parentCountryKey: 'japan',
      countryShortLabel: 'JP',
    }
  )
}

export function LocationProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false)
  const [location, setLocation] = useState<SavedLocationPreference>(() =>
    resolveInitialLocation(null),
  )
  const [hierarchy, setHierarchy] = useState<GetLocationsData | null>(null)
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [hierarchyError, setHierarchyError] = useState<string | null>(null)
  const [locationPickerSignal, bumpPickerSignal] = useReducer((x: number) => x + 1, 0)

  const reloadHierarchy = useCallback(() => {
    void (async () => {
      setHierarchyLoading(true)
      setHierarchyError(null)
      try {
        const data = await fetchLocationHierarchy()
        setHierarchy(data)
      } catch (e) {
        setHierarchyError(e instanceof Error ? e.message : 'Could not load locations')
      } finally {
        setHierarchyLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    reloadHierarchy()
  }, [reloadHierarchy])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY)
        if (!cancelled && stored) {
          try {
            const parsed = JSON.parse(stored) as unknown
            const resolved = parseStoredLocationPreference(parsed)
            if (resolved) {
              setLocation(resolved)
            } else {
              const key =
                typeof parsed === 'object' &&
                parsed &&
                'key' in parsed ?
                  String((parsed as { key?: unknown }).key ?? '')
                : ''
              setLocation(resolveInitialLocation(key || null))
            }
          } catch {
            setLocation(resolveInitialLocation(null))
          }
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Fill missing nav pill fields from hierarchy; avoid overwriting stored coordinates unnecessarily. */
  useEffect(() => {
    if (!ready || hierarchy == null) return
    setLocation((prev) => {
      const enriched = enrichSavedLocationFromHierarchy(prev, hierarchy)
      const changed =
        enriched.flag !== prev.flag ||
        enriched.countryShortLabel !== prev.countryShortLabel ||
        enriched.currency !== prev.currency ||
        enriched.timezone !== prev.timezone ||
        enriched.parentCountryKey !== prev.parentCountryKey ||
        (!prev.coordinates && enriched.coordinates)
      if (!changed) return prev
      void SecureStore.setItemAsync(STORAGE_KEY, serializePreference(enriched))
      return enriched
    })
  }, [hierarchy, ready])

  const setLocationPreferenceBase = useCallback((pref: SavedLocationPreference) => {
    const normalized: SavedLocationPreference = {
      ...pref,
      key: pref.key.trim().toLowerCase(),
    }
    setLocation(normalized)
    void SecureStore.setItemAsync(STORAGE_KEY, serializePreference(normalized))
  }, [])

  const setLocationPreference = useCallback(
    (pref: SavedLocationPreference) => {
      const normalized: SavedLocationPreference = {
        ...pref,
        key: pref.key.trim().toLowerCase(),
      }
      const merged =
        hierarchy != null ?
          enrichSavedLocationFromHierarchy(normalized, hierarchy)
        : normalized
      setLocationPreferenceBase(merged)
    },
    [hierarchy, setLocationPreferenceBase],
  )

  const setLocationByKey = useCallback(
    (key: string) => {
      const preset = getPresetLocationByKey(key)
      if (preset) {
        setLocationPreference(preset)
        return
      }
      const k = key.trim().toLowerCase()
      const city = hierarchy ? findCityInHierarchy(hierarchy, k) : undefined
      if (city) {
        const country = hierarchy!.hierarchy.countries.find((row) => row.key === city.parentKey)
        setLocationPreference(cityNodeToSavedLocation(city, country))
        return
      }
      setLocationPreference({ key: k, label: k })
    },
    [hierarchy, setLocationPreference],
  )

  const openLocationPicker = useCallback(() => {
    bumpPickerSignal()
  }, [])

  const closeLocationPicker = useCallback(() => {
    /* Host dismisses Gorhom modal; callers may no-op unless we attach shared ref later. */
  }, [])

  const value = useMemo(
    (): LocationContextValue => ({
      location,
      hierarchy,
      hierarchyLoading,
      hierarchyError,
      reloadHierarchy,
      setLocationByKey,
      setLocationPreference,
      ready,
      locationPickerSignal,
      openLocationPicker,
      closeLocationPicker,
    }),
    [
      closeLocationPicker,
      hierarchy,
      hierarchyError,
      hierarchyLoading,
      location,
      locationPickerSignal,
      openLocationPicker,
      ready,
      reloadHierarchy,
      setLocationByKey,
      setLocationPreference,
    ],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
