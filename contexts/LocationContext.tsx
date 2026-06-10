import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as SecureStore from 'expo-secure-store'

import { LocationPickerOverlay } from '@/components/navigation/LocationPickerOverlay'
import type { SavedLocationPreference } from '@/constants/locations'
import { readStoredLocationKey } from '@/constants/locations'
import {
  fetchLocationHierarchy,
  resolveActiveLocationFromHierarchy,
  savedLocationFromHierarchyKey,
  type GetLocationsData,
} from '@/services/onboardingService'

const STORAGE_KEY = 'tastyplates_mobile_location_prefs_v1'

const LOCATION_PLACEHOLDER: SavedLocationPreference = {
  key: '',
  label: '…',
}

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
  /** Set preference from a CMS city row (merged with hierarchy when loaded). */
  setLocationPreference: (pref: SavedLocationPreference) => void
  ready: boolean
  openLocationPicker: () => void
  closeLocationPicker: () => void
  isLocationPickerOpen: boolean
}

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false)
  const [storeHydrated, setStoreHydrated] = useState(false)
  const [storedKey, setStoredKey] = useState<string | null>(null)
  const [location, setLocation] = useState<SavedLocationPreference>(LOCATION_PLACEHOLDER)
  const [hierarchy, setHierarchy] = useState<GetLocationsData | null>(null)
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [hierarchyError, setHierarchyError] = useState<string | null>(null)
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const initialSyncDoneRef = useRef(false)

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
            setStoredKey(readStoredLocationKey(parsed))
          } catch {
            setStoredKey(null)
          }
        }
      } finally {
        if (!cancelled) setStoreHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistLocation = useCallback((pref: SavedLocationPreference) => {
    const normalized: SavedLocationPreference = {
      ...pref,
      key: pref.key.trim().toLowerCase(),
    }
    setLocation(normalized)
    void SecureStore.setItemAsync(STORAGE_KEY, serializePreference(normalized))
  }, [])

  /** Align pill + feeds with Nhost `get-locations` once store + hierarchy are available. */
  useEffect(() => {
    if (!storeHydrated || hierarchyLoading) return

    if (!hierarchy) {
      if (hierarchyError && !initialSyncDoneRef.current) {
        initialSyncDoneRef.current = true
        setReady(true)
      }
      return
    }

    if (!initialSyncDoneRef.current) {
      persistLocation(resolveActiveLocationFromHierarchy(hierarchy, storedKey))
      initialSyncDoneRef.current = true
      setReady(true)
      return
    }

    // Hierarchy refresh: keep selection if still in CMS; otherwise remap.
    setLocation((prev) => {
      if (prev.key && savedLocationFromHierarchyKey(hierarchy, prev.key)) return prev
      const fixed = resolveActiveLocationFromHierarchy(hierarchy, prev.key)
      void SecureStore.setItemAsync(STORAGE_KEY, serializePreference(fixed))
      return fixed
    })
  }, [storeHydrated, hierarchy, hierarchyLoading, hierarchyError, storedKey, persistLocation])

  const setLocationPreference = useCallback(
    (pref: SavedLocationPreference) => {
      if (hierarchy) {
        const fromApi = savedLocationFromHierarchyKey(hierarchy, pref.key)
        if (fromApi) {
          persistLocation(fromApi)
          return
        }
      }
      persistLocation(pref)
    },
    [hierarchy, persistLocation],
  )

  const setLocationByKey = useCallback(
    (key: string) => {
      if (!hierarchy) return
      const fromApi = savedLocationFromHierarchyKey(hierarchy, key)
      if (fromApi) persistLocation(fromApi)
    },
    [hierarchy, persistLocation],
  )

  const openLocationPicker = useCallback(() => {
    setIsLocationPickerOpen(true)
  }, [])

  const closeLocationPicker = useCallback(() => {
    setIsLocationPickerOpen(false)
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
      openLocationPicker,
      closeLocationPicker,
      isLocationPickerOpen,
    }),
    [
      closeLocationPicker,
      hierarchy,
      hierarchyError,
      hierarchyLoading,
      isLocationPickerOpen,
      location,
      openLocationPicker,
      ready,
      reloadHierarchy,
      setLocationByKey,
      setLocationPreference,
    ],
  )

  return (
    <LocationContext.Provider value={value}>
      {children}
      {isLocationPickerOpen ? (
        <LocationPickerOverlay
          hierarchy={hierarchy}
          hierarchyLoading={hierarchyLoading}
          hierarchyError={hierarchyError}
          selectedLocation={location}
          setLocationPreference={setLocationPreference}
          onClose={closeLocationPicker}
        />
      ) : null}
    </LocationContext.Provider>
  )
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
