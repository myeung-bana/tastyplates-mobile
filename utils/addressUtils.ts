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
