import type { LocationCoordinates } from '@/constants/locations'
import type { Region } from 'react-native-maps'

/** Discovery radius anchored to the selected major city. */
export const CITY_SEARCH_RADIUS_KM = 50

/** Google Places Nearby Search maximum (meters). */
export const CITY_SEARCH_RADIUS_METERS = 50_000

const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function isWithinRadiusKm(
  center: LocationCoordinates,
  lat: number,
  lng: number,
  radiusKm: number,
): boolean {
  return haversineDistanceKm(center.latitude, center.longitude, lat, lng) <= radiusKm
}

/** Map viewport covering a circular search area around the city center. */
export function mapRegionForRadiusKm(
  center: LocationCoordinates,
  radiusKm: number,
): Region {
  const latDelta = (radiusKm / 111) * 2
  const lngDelta = latDelta / Math.cos((center.latitude * Math.PI) / 180)
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  }
}

export function geoQueryFromCityCenter(
  center: LocationCoordinates | null | undefined,
  radiusKm = CITY_SEARCH_RADIUS_KM,
): {
  latitude?: number
  longitude?: number
  radiusKm?: number
} {
  if (
    center == null ||
    !Number.isFinite(center.latitude) ||
    !Number.isFinite(center.longitude)
  ) {
    return {}
  }
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    radiusKm,
  }
}
