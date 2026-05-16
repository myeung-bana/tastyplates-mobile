import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export interface OwnProfileStats {
  reviews: number | null
  wishlist: number | null
  checkins: number | null
  followers: number | null
  following: number | null
}

/**
 * Loads aggregate counts for the profile tab via Nhost Functions (`api_guide` §8.6).
 * Uses small `limit` requests where only `meta.total` is needed.
 */
export async function fetchOwnProfileStats(userId: string): Promise<OwnProfileStats> {
  const empty: OwnProfileStats = {
    reviews: null,
    wishlist: null,
    checkins: null,
    followers: null,
    following: null,
  }

  const q = (base: string, params: Record<string, string>) => {
    const u = new URLSearchParams(params)
    return `${base}?${u.toString()}`
  }

  const [followersRes, followingRes, reviewsRes, wishRes, checkRes] = await Promise.all([
    tastyplatesFetch<{ followersCount: number }>(
      q('restaurant-users/get-followers-count', { userId }),
    ),
    tastyplatesFetch<{ followingCount: number }>(
      q('restaurant-users/get-following-count', { userId }),
    ),
    tastyplatesFetch<{ meta: { total: number } }>(
      q('restaurant-users/get-reviews', {
        user_id: userId,
        limit: '1',
        offset: '0',
      }),
      { withAuth: true },
    ),
    tastyplatesFetch<{ meta: { total: number } }>(
      q('restaurant-users/get-wishlist', {
        user_id: userId,
        limit: '1',
        offset: '0',
      }),
      { withAuth: true },
    ),
    tastyplatesFetch<{ meta: { total: number } }>(
      q('restaurant-users/get-checkins', {
        user_id: userId,
        limit: '1',
        offset: '0',
      }),
      { withAuth: true },
    ),
  ])

  try {
    empty.followers = unwrapEnvelope(followersRes).followersCount
  } catch {
    /* keep null */
  }
  try {
    empty.following = unwrapEnvelope(followingRes).followingCount
  } catch {
    /* keep null */
  }
  try {
    empty.reviews = unwrapEnvelope(reviewsRes).meta.total
  } catch {
    /* keep null */
  }
  try {
    empty.wishlist = unwrapEnvelope(wishRes).meta.total
  } catch {
    /* keep null */
  }
  try {
    empty.checkins = unwrapEnvelope(checkRes).meta.total
  } catch {
    /* keep null */
  }

  return empty
}

/** Public-visible counts only (another user / signed-out viewers). Approved reviews meta. */
export interface PublicProfileCounts {
  reviews: number | null
  followers: number | null
  following: number | null
}

export async function fetchPublicProfileCounts(restaurantUserId: string): Promise<PublicProfileCounts> {
  const empty: PublicProfileCounts = { reviews: null, followers: null, following: null }
  const q = (base: string, params: Record<string, string>) => {
    const u = new URLSearchParams(params)
    return `${base}?${u.toString()}`
  }

  const [followersRes, followingRes, reviewsRes] = await Promise.all([
    tastyplatesFetch<{ followersCount: number }>(
      q('restaurant-users/get-followers-count', { userId: restaurantUserId }),
    ),
    tastyplatesFetch<{ followingCount: number }>(
      q('restaurant-users/get-following-count', { userId: restaurantUserId }),
    ),
    tastyplatesFetch<{ meta: { total: number } }>(
      q('restaurant-users/get-reviews', {
        user_id: restaurantUserId,
        limit: '1',
        offset: '0',
      }),
    ),
  ])

  try {
    empty.followers = unwrapEnvelope(followersRes).followersCount
  } catch {
    /* keep null */
  }
  try {
    empty.following = unwrapEnvelope(followingRes).followingCount
  } catch {
    /* keep null */
  }
  try {
    empty.reviews = unwrapEnvelope(reviewsRes).meta.total
  } catch {
    /* keep null */
  }

  return empty
}
