import type {
  RestaurantListCategory,
  RestaurantListCuisine,
  RestaurantListRow,
} from '@/services/restaurantsV2Service'

/** A TastyPlates-sourced restaurant — has slug, reviews, TP ratings. */
export interface TPRestaurantResult {
  source: 'tp'
  id: number
  uuid: string
  slug: string
  title: string
  featured_image_url: string | null
  listing_street: string | null
  address: RestaurantListRow['address']
  average_rating: number | null
  ratings_count: number | null
  cuisines: RestaurantListCuisine[]
  categories: RestaurantListCategory[]
  google_place_id?: string | null
  latitude: number | null
  longitude: number | null
  _distance?: number | null
}

/** A Google Places result with no TastyPlates match. */
export interface GoogleRestaurantResult {
  source: 'google'
  place_id: string
  title: string
  featured_image_url: string | null
  address: string | null
  google_rating: number | null
  google_review_count?: number | null
  latitude?: number | null
  longitude?: number | null
  types?: string[] | null
}

export type RestaurantSearchResult = TPRestaurantResult | GoogleRestaurantResult

export const isTPResult = (r: RestaurantSearchResult): r is TPRestaurantResult =>
  r.source === 'tp'

export const isGoogleResult = (r: RestaurantSearchResult): r is GoogleRestaurantResult =>
  r.source === 'google'
