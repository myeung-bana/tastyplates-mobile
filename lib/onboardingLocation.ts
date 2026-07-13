import type { ProfileCitySelection } from '@/lib/googlePlaces'
import type { GetLocationsData } from '@/services/onboardingService'
import {
  cityNodeToSavedLocation,
  findCityInHierarchy,
  type OnboardingLocationValue,
} from '@/services/onboardingService'
import type { UserProfileGeographicLocationInput } from '@/services/restaurantUserService'
import type { UserProfileLocationSnapshot } from '@/services/restaurantUserService'
import { formatLocationDisplay } from '@/utils/locationUtils'

export function locationFromProfileSnapshot(
  row: UserProfileLocationSnapshot | null | undefined,
): OnboardingLocationValue | null {
  if (!row?.label?.trim()) return null
  const lat = row.latitude
  const lng = row.longitude
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    label: row.label.trim(),
    latitude: lat!,
    longitude: lng!,
    googlePlaceId: row.google_place_id?.trim() || null,
    cmsSlug: row.slug?.trim().toLowerCase() || null,
  }
}

export function selectionToLocationValue(selection: ProfileCitySelection): OnboardingLocationValue {
  return {
    label: selection.label,
    latitude: selection.latitude,
    longitude: selection.longitude,
    googlePlaceId: selection.google_place_id?.trim() || null,
    cmsSlug: selection.location_slug?.trim().toLowerCase() || null,
  }
}

export function locationValueFromLegacyDraftKey(
  locationKey: string | undefined,
  locationLabel: string | undefined,
  hierarchy: GetLocationsData | null,
): OnboardingLocationValue | null {
  const key = locationKey?.trim().toLowerCase()
  if (!key) return null

  if (hierarchy) {
    const city = findCityInHierarchy(hierarchy, key)
    if (city) {
      const country = hierarchy.hierarchy.countries.find((c) => c.key === city.parentKey)
      const pref = cityNodeToSavedLocation(city, country)
      const lat = pref.coordinates?.latitude
      const lng = pref.coordinates?.longitude
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          label: formatLocationDisplay(pref, hierarchy.hierarchy.countries),
          latitude: lat!,
          longitude: lng!,
          googlePlaceId: null,
          cmsSlug: pref.key,
        }
      }
    }
  }

  const label = locationLabel?.trim()
  if (!label) return null
  return null
}

export function locationValueToApiInput(
  loc: OnboardingLocationValue | null | undefined,
): UserProfileGeographicLocationInput | null {
  if (!loc?.label?.trim()) return null
  const out: UserProfileGeographicLocationInput = {
    label: loc.label.trim(),
    latitude: loc.latitude,
    longitude: loc.longitude,
  }
  const placeId = loc.googlePlaceId?.trim()
  if (placeId) out.google_place_id = placeId
  const slug = loc.cmsSlug?.trim().toLowerCase()
  if (slug) out.location_slug = slug
  return out
}
