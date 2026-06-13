import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

/** Full row from `restaurants-v2/get-restaurant-by-id` (Hasura `restaurants`). */
export interface RestaurantDetailRow {
  id: number
  uuid: string
  title: string
  slug: string
  status: string
  content: string | null
  price_range_id: number | null
  average_rating: number | null
  ratings_count: number | null
  listing_street: string | null
  phone: string | null
  menu_url: string | null
  longitude: number | null
  latitude: number | null
  google_zoom: number | null
  featured_image_url: string | null
  uploaded_images: unknown
  opening_hours: unknown
  address: Record<string, unknown> | null
  cuisines: unknown
  palates: unknown
  categories: unknown
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface RatingSummaryRow {
  restaurant_id: number
  overall_rating_avg: number | null
  overall_review_count: number
  authentic_rating_avg: number | null
  authentic_review_count: number
  authentic_rating_weighted: number | null
  updated_at: string
}

export interface ReviewAuthorProfile {
  user_id?: string
  username?: string | null
  palates?: unknown
  user?: { avatarUrl?: string | null; email?: string | null } | null
}

/** Preview row from `restaurant-reviews/get-reviews-by-restaurant`. */
export interface RestaurantReviewPreview {
  id: string
  title: string | null
  content: string | null
  rating: number | null
  images: unknown
  likes_count?: number | null
  status?: string | null
  AuthorProfile?: ReviewAuthorProfile | null
}

export interface GetRestaurantBySlugResponse {
  restaurant: RestaurantDetailRow
}

export interface GetReviewsByRestaurantResponse {
  reviews: TrendingReviewRow[]
  meta: { total: number; limit: number; offset: number; hasMore: boolean }
}

/**
 * Single restaurant by slug (published or not — server returns 404 if missing).
 */
export async function getRestaurantBySlug(slug: string): Promise<RestaurantDetailRow> {
  const envelope = await tastyplatesFetch<GetRestaurantBySlugResponse>(
    `restaurants-v2/get-restaurant-by-id?slug=${encodeURIComponent(slug)}`,
  )
  const data = unwrapEnvelope(envelope)
  return data.restaurant
}

/**
 * Aggregate rating row from `restaurant_rating_summary` (may be null if no summaries).
 */
export async function getRatingSummary(uuid: string): Promise<RatingSummaryRow | null> {
  const envelope = await tastyplatesFetch<RatingSummaryRow | null>(
    `restaurants-v2/get-rating-summary?uuid=${encodeURIComponent(uuid)}`,
  )
  if (!envelope.ok) return null
  return envelope.data
}

export async function getRestaurantReviewsPreview(
  restaurantUuid: string,
  limit = 8,
): Promise<GetReviewsByRestaurantResponse> {
  return fetchRestaurantReviews(restaurantUuid, { limit, offset: 0 })
}

export async function fetchRestaurantReviews(
  restaurantUuid: string,
  options?: {
    limit?: number
    offset?: number
    sort?: 'all' | 'asc' | 'desc' | 'highest'
  },
): Promise<GetReviewsByRestaurantResponse> {
  const limit = Math.min(Math.max(options?.limit ?? 16, 1), 100)
  const offset = Math.max(options?.offset ?? 0, 0)
  const sort = options?.sort ?? 'all'
  const q = new URLSearchParams({
    restaurant_uuid: restaurantUuid,
    limit: String(limit),
    offset: String(offset),
    sort,
  })
  const envelope = await tastyplatesFetch<GetReviewsByRestaurantResponse>(
    `restaurant-reviews/get-reviews-by-restaurant?${q.toString()}`,
  )
  return unwrapEnvelope(envelope)
}
