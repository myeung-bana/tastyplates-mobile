import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/** Author fragment from `restaurant-reviews/get-all-reviews`. */
export interface TrendingReviewAuthor {
  user_id?: string
  username?: string | null
  palates?: unknown
  user?: { avatarUrl?: string | null; email?: string | null } | null
}

/** Row from `restaurant-reviews/get-all-reviews`. */
export interface TrendingReviewRow {
  id: string
  author_id: string
  content: string | null
  created_at: string
  hashtags?: unknown
  images: unknown
  rating: number | null
  title: string | null
  restaurant_uuid: string
  AuthorProfile?: TrendingReviewAuthor | null
}

export interface GetAllReviewsResponse {
  reviews: TrendingReviewRow[]
  meta: {
    total: number
    limit: number
    cursor: string | null
    hasMore: boolean
  }
}

/**
 * Latest approved global reviews (same source as web “Trending” — `auth-review.md` §1).
 */
export async function getLatestReviews(limit = 5): Promise<TrendingReviewRow[]> {
  const q = new URLSearchParams({
    limit: String(Math.min(Math.max(limit, 1), 100)),
    offset: '0',
  })
  const envelope = await tastyplatesFetch<GetAllReviewsResponse>(
    `restaurant-reviews/get-all-reviews?${q.toString()}`,
  )
  const data = unwrapEnvelope(envelope)
  return data.reviews ?? []
}
