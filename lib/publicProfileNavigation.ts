import type { Router } from 'expo-router'

import { SCREEN_PUBLIC_PROFILE } from '@/constants/screens'
import { isRestaurantUserRouteId } from '@/services/restaurantUserService'

export type PublicProfileNavInput = {
  /** `restaurant_reviews.author_id` or `RestaurantUserRow.id` (Nhost auth UUID). */
  authorId?: string | null
  /** `AuthorProfile.user_id` when nested on a review / reply. */
  profileUserId?: string | null
  /** Public `user_profiles.username` slug (with or without leading `@`). */
  username?: string | null
}

/**
 * Picks the `[userId]` route segment for public profiles.
 * Prefers a stable auth UUID over username so stale/wrong usernames cannot 404 the screen.
 */
export function resolvePublicProfileRouteSegment(input: PublicProfileNavInput): string | null {
  for (const raw of [input.authorId, input.profileUserId]) {
    const id = raw?.trim()
    if (id && isRestaurantUserRouteId(id)) return id
  }

  const handle = input.username?.trim().replace(/^@/, '')
  return handle || null
}

/** Navigate to `/(tabs)/profile/[userId]`. Returns false when no routable id/username. */
export function pushPublicProfile(
  router: Pick<Router, 'push'>,
  input: PublicProfileNavInput,
): boolean {
  const userId = resolvePublicProfileRouteSegment(input)
  if (!userId) return false

  router.push({
    pathname: SCREEN_PUBLIC_PROFILE,
    params: { userId },
  })
  return true
}

export function publicProfileFromAuthorFields(
  authorId: string | null | undefined,
  profile?: { user_id?: string | null; username?: string | null } | null,
): PublicProfileNavInput {
  return {
    authorId,
    profileUserId: profile?.user_id,
    username: profile?.username,
  }
}
