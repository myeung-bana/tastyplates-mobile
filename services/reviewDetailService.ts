import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/** Row returned by `restaurant-reviews/get-review-by-id`. */
export interface ReviewDetailRow {
  id: string
  restaurant_uuid: string
  author_id: string
  parent_review_id: string | null
  title: string | null
  content: string | null
  rating: number | null
  images: unknown
  palates?: unknown
  hashtags?: unknown
  mentions?: unknown
  recognitions?: unknown
  likes_count?: number | null
  replies_count?: number | null
  user_liked?: boolean | null
  status?: string | null
  is_pinned?: boolean | null
  is_featured?: boolean | null
  created_at: string
  updated_at?: string | null
  published_at?: string | null
}

interface GetReviewByIdResponse {
  review: ReviewDetailRow
}

interface RestaurantBriefPayload {
  title?: string | null
  slug?: string | null
}

interface GetRestaurantByIdResponse {
  restaurant: RestaurantBriefPayload
}

/**
 * Loads a review by UUID. Sends Bearer when logged in so unapproved drafts are visible to the author.
 */
export async function fetchReviewById(id: string): Promise<ReviewDetailRow> {
  const envelope = await tastyplatesFetch<GetReviewByIdResponse>(
    `restaurant-reviews/get-review-by-id?id=${encodeURIComponent(id)}`,
    { withAuth: true },
  )
  return unwrapEnvelope(envelope).review
}

export interface RestaurantBrief {
  title: string | null
  slug: string | null
}

/** Best-effort: returns null if listing is unavailable or UUID not found. */
export async function fetchRestaurantBriefByUuid(uuid: string): Promise<RestaurantBrief | null> {
  const envelope = await tastyplatesFetch<GetRestaurantByIdResponse>(
    `restaurants-v2/get-restaurant-by-id?uuid=${encodeURIComponent(uuid)}`,
  )
  if (!envelope.ok) return null
  const r = envelope.data.restaurant as RestaurantBriefPayload
  return {
    title: typeof r.title === 'string' ? r.title : null,
    slug: typeof r.slug === 'string' ? r.slug : null,
  }
}
