/**
 * Address formatting utilities.
 *
 * Handles partial or inconsistently structured address data from Hasura.
 */

export interface AddressComponents {
  streetNumber?: string | null
  streetName?: string | null
  suburb?: string | null
  city?: string | null
  state?: string | null
  postcode?: string | null
  country?: string | null
  formattedAddress?: string | null
}

/**
 * Return the best available address string for display.
 *
 * Priority:
 * 1. `formattedAddress` if present
 * 2. Constructed from components: "streetNumber streetName, suburb, city"
 * 3. Just the city or suburb
 * 4. Fallback empty string
 */
export function getBestAddress(address: AddressComponents | null | undefined): string {
  if (!address) return ''

  if (address.formattedAddress) return address.formattedAddress

  const parts: string[] = []

  const streetLine = [address.streetNumber, address.streetName].filter(Boolean).join(' ')
  if (streetLine) parts.push(streetLine)

  if (address.suburb) parts.push(address.suburb)
  if (address.city && address.city !== address.suburb) parts.push(address.city)

  return parts.join(', ')
}

/**
 * Return a short "neighbourhood, city" label for map pins and compact cards.
 */
export function getShortAddress(address: AddressComponents | null | undefined): string {
  if (!address) return ''

  const parts: string[] = []
  if (address.suburb) parts.push(address.suburb)
  else if (address.streetName) parts.push(address.streetName)

  if (address.city) parts.push(address.city)

  return parts.join(', ')
}

/**
 * Format an address for a Google Maps / Apple Maps deep-link query string.
 */
export function getMapsQuery(address: AddressComponents | null | undefined): string {
  return encodeURIComponent(getBestAddress(address))
}

/**
 * Shape of the `address` JSONB column on Hasura `restaurants` rows.
 * Mirrors the web `GoogleMapUrl` type.
 */
export interface HasuraGoogleMapUrl {
  streetAddress?: string | null
  streetNumber?: string | null
  streetName?: string | null
  suburb?: string | null
  city?: string | null
  state?: string | null
  stateShort?: string | null
  country?: string | null
  countryShort?: string | null
  postCode?: string | null
  latitude?: string | null
  longitude?: string | null
  placeId?: string | null
  zoom?: number | null
}

/**
 * Best display address for a Hasura restaurant row.
 *
 * Priority (mirrors web `getBestAddress`):
 * 1. `googleMapUrl.streetAddress`
 * 2. Composed "streetNumber streetName, suburb/city" from `googleMapUrl`
 * 3. `listingStreet` plain text field
 * 4. `fallback` (default empty string)
 */
export function getBestRestaurantAddress(
  googleMapUrl?: HasuraGoogleMapUrl | null,
  listingStreet?: string | null,
  fallback = '',
): string {
  if (googleMapUrl?.streetAddress?.trim()) return googleMapUrl.streetAddress.trim()

  if (googleMapUrl) {
    const parts: string[] = []
    const street = [googleMapUrl.streetNumber, googleMapUrl.streetName].filter(Boolean).join(' ')
    if (street) parts.push(street)
    if (googleMapUrl.suburb) parts.push(googleMapUrl.suburb)
    else if (googleMapUrl.city) parts.push(googleMapUrl.city)
    const composed = parts.join(', ')
    if (composed) return composed
  }

  if (listingStreet?.trim()) return listingStreet.trim()

  return fallback
}
