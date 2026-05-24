import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { PlacesDetailsResult } from '@/lib/googlePlaces'

export interface CreateRestaurantResult {
  uuid: string
  slug: string
  title: string
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function placeDetailsToCreateBody(details: PlacesDetailsResult): Record<string, unknown> {
  const title = details.name?.trim() || 'Restaurant'
  const lat = details.geometry?.location?.lat
  const lng = details.geometry?.location?.lng
  const street = details.formatted_address ?? details.vicinity ?? ''

  return {
    title,
    slug: generateSlug(title),
    listing_street: street || undefined,
    latitude: lat,
    longitude: lng,
    address: {
      place_id: details.place_id,
      streetAddress: street,
    },
    status: 'publish',
  }
}

export async function createRestaurantFromPlace(
  details: PlacesDetailsResult,
): Promise<CreateRestaurantResult> {
  const envelope = await tastyplatesFetch<{
    restaurant: {
      uuid: string
      slug: string
      title: string
    }
  }>('restaurants-v2/create-restaurant', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify(placeDetailsToCreateBody(details)),
  })

  const data = unwrapEnvelope(envelope)
  const row = data.restaurant
  if (!row?.uuid) throw new Error('Failed to create restaurant')
  return {
    uuid: row.uuid,
    slug: row.slug,
    title: row.title,
  }
}
