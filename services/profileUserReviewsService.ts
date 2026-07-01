import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import type {
  FollowingFeedActivity,
  FollowingFeedMeta,
} from '@/services/followingFeedService'
import { parseFollowingFeedActivity } from '@/services/followingFeedService'

export const PROFILE_REVIEWS_PREVIEW_LIMIT = 4
export const PROFILE_ACTIVITY_DEFAULT_LIMIT = 3

/**
 * Canonical profile review list — same route as profile stats (`profileStatsService`).
 * Always requests approved reviews only (drafts live in Studio → Manage Reviews).
 */
export const PROFILE_USER_REVIEWS_PATH = 'restaurant-users/get-reviews'

/** Mixed profile activity endpoint — review slice uses shared `listUserReviews` on backend. */
export const PROFILE_USER_ACTIVITY_PATH = 'restaurant-reviews/get-user-activity'

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

export type FetchProfileReviewsOptions = {
  limit?: number
  offset?: number
}

function profileReviewsQuery(
  userId: string,
  options?: FetchProfileReviewsOptions,
): URLSearchParams {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100)
  const offset = Math.max(options?.offset ?? 0, 0)
  // No `status` param — uses the public approved query (same as fetchPublicProfileCounts).
  return new URLSearchParams({
    user_id: userId,
    limit: String(limit),
    offset: String(offset),
  })
}

/**
 * Paginated approved reviews for a profile (Me / Reviews tab / previews).
 * Uses `restaurant-users/get-reviews` — aligned with profile stats Posts count.
 */
export async function fetchUserReviews(
  userId: string,
  options?: FetchProfileReviewsOptions,
): Promise<FetchUserReviewsResult> {
  const q = profileReviewsQuery(userId, options)
  const path = `${PROFILE_USER_REVIEWS_PATH}?${q}`
  if (__DEV__) {
    console.log('[fetchUserReviews]', path)
  }
  const envelope = await tastyplatesFetch<FetchUserReviewsResult>(path)
  return unwrapEnvelope(envelope)
}

export type FetchProfileActivityOptions = {
  limit?: number
  offset?: number
  withAuth?: boolean
}

/**
 * Mixed profile activity (reviews, check-ins, comments).
 */
export async function fetchProfileUserActivity(
  userId: string,
  options?: FetchProfileActivityOptions,
): Promise<{ activities: FollowingFeedActivity[]; meta: FollowingFeedMeta }> {
  const limit = options?.limit ?? PROFILE_ACTIVITY_DEFAULT_LIMIT
  const offset = options?.offset ?? 0
  const q = new URLSearchParams({
    user_id: userId,
    limit: String(Math.min(Math.max(limit, 1), 20)),
    offset: String(offset),
  })
  const envelope = await tastyplatesFetch<{
    activities?: Record<string, unknown>[]
    meta: FollowingFeedMeta
  }>(`${PROFILE_USER_ACTIVITY_PATH}?${q}`, options?.withAuth ? { withAuth: true } : {})

  const data = unwrapEnvelope(envelope)
  const activities = (data.activities ?? [])
    .map((row) => parseFollowingFeedActivity(row))
    .filter((row): row is FollowingFeedActivity => row != null)

  return { activities, meta: data.meta }
}
