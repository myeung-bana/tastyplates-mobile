import type { LocationCoordinates } from '@/constants/locations'
import type { Region } from 'react-native-maps'

/** Discovery radius anchored to the selected major city (max cap for map-pan queries). */
export const CITY_SEARCH_RADIUS_KM = 20

/** Google Places Nearby Search maximum (meters). */
export const CITY_SEARCH_RADIUS_METERS = 20_000

/** Initial Explore map zoom — tighter than the full city search radius. */
export const MAP_INITIAL_VIEW_RADIUS_KM = 1

/** Default query radius after the user pans the map (before viewport-derived sizing). */
export const MAP_PAN_SEARCH_RADIUS_KM = 12

/** Min / max for viewport-derived search radius after pan/zoom. */
export const MAP_PAN_SEARCH_RADIUS_MIN_KM = 3
export const MAP_PAN_SEARCH_RADIUS_MAX_KM = CITY_SEARCH_RADIUS_KM

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

function clampLongitudeDelta(latitude: number, lngDelta: number): number {
  if (!Number.isFinite(lngDelta) || lngDelta <= 0) return 0.05
  const maxLngDelta = 360
  const latRad = (latitude * Math.PI) / 180
  const cosLat = Math.cos(latRad)
  if (!Number.isFinite(cosLat) || Math.abs(cosLat) < 0.01) {
    return Math.min(maxLngDelta, Math.max(lngDelta, 0.05))
  }
  return Math.min(maxLngDelta, lngDelta)
}

/** Map viewport covering a circular search area around the city center. */
export function mapRegionForRadiusKm(
  center: LocationCoordinates,
  radiusKm: number,
): Region | null {
  const { latitude, longitude } = center
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const safeRadiusKm = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : MAP_INITIAL_VIEW_RADIUS_KM
  const latDelta = Math.max((safeRadiusKm / 111) * 2, 0.01)
  const lngDelta = clampLongitudeDelta(latitude, latDelta / Math.cos((latitude * Math.PI) / 180))
  return {
    latitude,
    longitude,
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
    radiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : CITY_SEARCH_RADIUS_KM,
  }
}

/** Approximate search radius from the visible map region (latitude span). */
export function radiusKmFromMapRegion(region: Region): number {
  const latDelta = region.latitudeDelta
  if (!Number.isFinite(latDelta) || latDelta <= 0) return MAP_PAN_SEARCH_RADIUS_KM
  const halfSpanKm = (latDelta / 2) * 111
  const scaled = halfSpanKm * 0.9
  if (!Number.isFinite(scaled)) return MAP_PAN_SEARCH_RADIUS_KM
  return Math.min(
    MAP_PAN_SEARCH_RADIUS_MAX_KM,
    Math.max(MAP_PAN_SEARCH_RADIUS_MIN_KM, scaled),
  )
}

export function isValidMapRegion(region: Region | null | undefined): region is Region {
  if (region == null) return false
  return (
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    region.latitudeDelta > 0 &&
    Number.isFinite(region.longitudeDelta) &&
    region.longitudeDelta > 0
  )
}

export function coordinatesFromRegion(region: Region): LocationCoordinates | null {
  if (!isValidMapRegion(region)) return null
  return { latitude: region.latitude, longitude: region.longitude }
}

const COORD_EPSILON = 0.0001

export function coordinatesEqual(
  a: LocationCoordinates | null | undefined,
  b: LocationCoordinates | null | undefined,
): boolean {
  if (a == null || b == null) return a === b
  return (
    Math.abs(a.latitude - b.latitude) < COORD_EPSILON &&
    Math.abs(a.longitude - b.longitude) < COORD_EPSILON
  )
}

export function coordinatesMovedEnough(
  a: LocationCoordinates,
  b: LocationCoordinates,
  thresholdKm = 0.35,
): boolean {
  return haversineDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude) >= thresholdKm
}
