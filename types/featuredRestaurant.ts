/** Featured / recommended restaurant row (home carousel, article associations). */
export interface FeaturedRestaurantApi {
  id: number
  restaurant: {
    id: number
    slug: string
    title: string
    featured_image_url: string | null
    listing_street: string | null
    address: {
      city?: string
      country_short?: string
      street_address?: string
    } | null
    average_rating: number | null
    ratings_count: number | null
  }
}
