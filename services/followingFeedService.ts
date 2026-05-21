import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

import type { TrendingReviewRow } from '@/services/homeReviewsService'
import type { RestaurantUserRow } from '@/services/restaurantUserService'

/** Restaurant summary merged onto each following-feed review by Nhost (`get-following-feed`). */
export interface FollowingFeedRestaurantBrief {
  uuid: string
  title: string | null
  slug: string | null
}

export type FollowingFeedReviewRow = TrendingReviewRow & {
  restaurant?: FollowingFeedRestaurantBrief | null
}

export interface FollowingFeedMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface FollowingFeedResponse {
  reviews: FollowingFeedReviewRow[]
  meta: FollowingFeedMeta
}

export interface FollowingCountResponse {
  userId: string
  followingCount: number
}

export interface SuggestedUsersResponse {
  users: RestaurantUserRow[]
}

/**
 * How many users this profile follows (`restaurant_user_follows` as follower).
 */
export async function fetchFollowingCount(userId: string): Promise<FollowingCountResponse> {
  const q = new URLSearchParams({ userId })
  const envelope = await tastyplatesFetch<FollowingCountResponse>(
    `restaurant-users/get-following-count?${q.toString()}`,
  )
  return unwrapEnvelope(envelope)
}

/**
 * Approved reviews from authors the signed-in user follows. Requires Bearer; `user_id` must match JWT.
 */
export async function fetchFollowingFeed(
  authUserId: string,
  opts?: { limit?: number; offset?: number },
): Promise<FollowingFeedResponse> {
  const limit = opts?.limit ?? 40
  const offset = opts?.offset ?? 0
  const q = new URLSearchParams({
    user_id: authUserId,
    limit: String(Math.min(Math.max(limit, 1), 100)),
    offset: String(offset),
  })
  const envelope = await tastyplatesFetch<FollowingFeedResponse>(
    `restaurant-reviews/get-following-feed?${q.toString()}`,
    { withAuth: true },
  )
  return unwrapEnvelope(envelope)
}

/**
 * Suggested profiles to follow. Bearer recommended so the viewer is excluded from results.
 */
export async function fetchSuggestedUsers(limit = 12): Promise<RestaurantUserRow[]> {
  const q = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 50)) })
  const envelope = await tastyplatesFetch<SuggestedUsersResponse>(
    `restaurant-users/suggested?${q.toString()}`,
    { withAuth: true },
  )
  const data = unwrapEnvelope(envelope)
  return data.users ?? []
}
