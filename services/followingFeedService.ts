import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

import type { TrendingReviewRow } from '@/services/homeReviewsService'

/** Restaurant summary merged onto each following-feed row by Nhost. */
export interface FollowingFeedRestaurantBrief {
  uuid: string
  title: string | null
  slug: string | null
}

export type FollowingFeedAuthorProfile = NonNullable<TrendingReviewRow['AuthorProfile']>

export type FollowingFeedReviewRow = TrendingReviewRow & {
  restaurant?: FollowingFeedRestaurantBrief | null
}

export type FollowingFeedCheckinRow = {
  type: 'checkin'
  id: string
  user_id: string
  restaurant_uuid: string
  checked_in_at: string
  created_at: string
  AuthorProfile?: FollowingFeedAuthorProfile | null
  restaurant?: FollowingFeedRestaurantBrief | null
}

export type FollowingFeedCommentRow = {
  type: 'comment'
  id: string
  parent_review_id: string
  content: string | null
  created_at: string
  author_id: string
  restaurant_uuid: string | null
  AuthorProfile?: FollowingFeedAuthorProfile | null
  restaurant?: FollowingFeedRestaurantBrief | null
}

export type FollowingFeedReviewActivity = FollowingFeedReviewRow & { type: 'review' }

export type FollowingFeedActivity =
  | FollowingFeedReviewActivity
  | FollowingFeedCheckinRow
  | FollowingFeedCommentRow

export interface FollowingFeedMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface FollowingFeedResponse {
  reviews: FollowingFeedReviewRow[]
  activities: FollowingFeedActivity[]
  meta: FollowingFeedMeta
}

export interface FollowingCountResponse {
  userId: string
  followingCount: number
}

export interface SuggestedUsersResponse {
  users: import('@/services/restaurantUserService').RestaurantUserRow[]
}

function parseActivity(raw: Record<string, unknown>): FollowingFeedActivity | null {
  const type = raw.type
  const id = typeof raw.id === 'string' ? raw.id : null
  if (!id) return null

  if (type === 'checkin') {
    const user_id = typeof raw.user_id === 'string' ? raw.user_id : null
    const restaurant_uuid = typeof raw.restaurant_uuid === 'string' ? raw.restaurant_uuid : null
    const checked_in_at =
      typeof raw.checked_in_at === 'string'
        ? raw.checked_in_at
        : typeof raw.created_at === 'string'
          ? raw.created_at
          : null
    if (!user_id || !restaurant_uuid || !checked_in_at) return null
    return {
      type: 'checkin',
      id,
      user_id,
      restaurant_uuid,
      checked_in_at,
      created_at: checked_in_at,
      AuthorProfile: (raw.AuthorProfile as FollowingFeedAuthorProfile | null | undefined) ?? null,
      restaurant: (raw.restaurant as FollowingFeedRestaurantBrief | null | undefined) ?? null,
    }
  }

  if (type === 'comment') {
    const parent_review_id =
      typeof raw.parent_review_id === 'string' ? raw.parent_review_id : null
    const author_id = typeof raw.author_id === 'string' ? raw.author_id : null
    const created_at = typeof raw.created_at === 'string' ? raw.created_at : null
    if (!parent_review_id || !author_id || !created_at) return null
    return {
      type: 'comment',
      id,
      parent_review_id,
      content: typeof raw.content === 'string' ? raw.content : null,
      created_at,
      author_id,
      restaurant_uuid:
        typeof raw.restaurant_uuid === 'string' ? raw.restaurant_uuid : null,
      AuthorProfile: (raw.AuthorProfile as FollowingFeedAuthorProfile | null | undefined) ?? null,
      restaurant: (raw.restaurant as FollowingFeedRestaurantBrief | null | undefined) ?? null,
    }
  }

  if (type === 'review' || type == null) {
    return {
      type: 'review',
      ...(raw as unknown as FollowingFeedReviewRow),
      id,
    }
  }

  return null
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
 * Mixed activity from people the signed-in user follows (reviews, check-ins, comments).
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
  const envelope = await tastyplatesFetch<{
    reviews?: FollowingFeedReviewRow[]
    activities?: Record<string, unknown>[]
    meta: FollowingFeedMeta
  }>(`restaurant-reviews/get-following-feed?${q.toString()}`, { withAuth: true })

  const data = unwrapEnvelope(envelope)
  const activities = (data.activities ?? [])
    .map((row) => parseActivity(row))
    .filter((row): row is FollowingFeedActivity => row != null)

  const reviewsFromActivities = activities.filter(
    (a): a is FollowingFeedReviewActivity => a.type === 'review',
  )

  return {
    reviews: data.reviews?.length ? data.reviews : reviewsFromActivities,
    activities: activities.length > 0 ? activities : reviewsFromActivities,
    meta: data.meta,
  }
}

/** Mixed public activity for a profile (`restaurant-reviews/get-user-activity`). */
export async function fetchUserActivity(
  userId: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ activities: FollowingFeedActivity[]; meta: FollowingFeedMeta }> {
  const limit = opts?.limit ?? 3
  const offset = opts?.offset ?? 0
  const q = new URLSearchParams({
    user_id: userId,
    limit: String(Math.min(Math.max(limit, 1), 20)),
    offset: String(offset),
  })
  const envelope = await tastyplatesFetch<{
    activities?: Record<string, unknown>[]
    meta: FollowingFeedMeta
  }>(`restaurant-reviews/get-user-activity?${q.toString()}`)

  const data = unwrapEnvelope(envelope)
  const activities = (data.activities ?? [])
    .map((row) => parseActivity(row))
    .filter((row): row is FollowingFeedActivity => row != null)

  return { activities, meta: data.meta }
}

/**
 * Suggested profiles to follow. Bearer recommended so the viewer is excluded from results.
 */
export async function fetchSuggestedUsers(
  limit = 12,
): Promise<SuggestedUsersResponse['users']> {
  const q = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 50)) })
  const envelope = await tastyplatesFetch<{ users: SuggestedUsersResponse['users'] }>(
    `restaurant-users/suggested?${q.toString()}`,
    { withAuth: true },
  )
  const data = unwrapEnvelope(envelope)
  return data.users ?? []
}
