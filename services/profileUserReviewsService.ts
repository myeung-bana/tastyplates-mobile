import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

export interface UserReviewsMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface FetchUserReviewsResult {
  reviews: TrendingReviewRow[]
  meta: UserReviewsMeta
}

/**
 * Lists reviews for an author (`restaurant-reviews/get-user-reviews`).
 * Without auth: approved only. With auth + `withAuth`: owner sees drafts too (same rule as backend `canReadPrivate`).
 */
export async function fetchUserReviews(
  authorId: string,
  options?: { limit?: number; offset?: number; withAuth?: boolean },
): Promise<FetchUserReviewsResult> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100)
  const offset = Math.max(options?.offset ?? 0, 0)
  const q = new URLSearchParams({
    author_id: authorId,
    limit: String(limit),
    offset: String(offset),
  })
  const envelope = await tastyplatesFetch<FetchUserReviewsResult>(
    `restaurant-reviews/get-user-reviews?${q}`,
    options?.withAuth ? { withAuth: true } : {},
  )
  return unwrapEnvelope(envelope)
}
