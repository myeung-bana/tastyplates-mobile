import type { PlacesDetailsResult } from '@/lib/googlePlaces'
import { googlePlacePhotoUrl } from '@/lib/googlePlaces'
import type { RestaurantDetailRow } from '@/services/restaurantDetailService'

/** Maps Google Place Details into the shared {@link RestaurantDetailRow} shape for UI reuse. */
export function adaptGooglePlaceToDetailRow(
  place: PlacesDetailsResult,
  placeId: string,
): RestaurantDetailRow {
  const photoRef = place.photos?.[0]?.photo_reference
  const addressLine = place.formatted_address ?? place.vicinity ?? null

  return {
    id: 0,
    uuid: '',
    slug: '',
    title: place.name?.trim() || 'Restaurant',
    status: 'publish',
    content: null,
    price_range_id: null,
    average_rating: place.rating ?? null,
    ratings_count: place.user_ratings_total ?? null,
    listing_street: addressLine,
    phone: null,
    menu_url: null,
    longitude: place.geometry?.location?.lng ?? null,
    latitude: place.geometry?.location?.lat ?? null,
    google_zoom: null,
    featured_image_url: photoRef ? googlePlacePhotoUrl(photoRef, 1200) : null,
    uploaded_images: null,
    opening_hours: null,
    address: addressLine ? { street_address: addressLine, place_id: placeId } : { place_id: placeId },
    cuisines: null,
    palates: null,
    categories: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
  }
}
