import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/**
 * Viewer must be signed in (`withAuth`).
 * `targetUserId` is the UUID of `restaurant_users.id` being followed/unfollowed.
 */
export async function checkFollowStatus(targetUserId: string): Promise<boolean> {
  const envelope = await tastyplatesFetch<{ is_following: boolean }>(
    'restaurant-users/check-follow-status',
    {
      method: 'POST',
      body: JSON.stringify({ user_id: targetUserId }),
      withAuth: true,
    },
  )
  return unwrapEnvelope(envelope).is_following
}

export async function followRestaurantUser(targetUserId: string): Promise<void> {
  const envelope = await tastyplatesFetch<{ followed: boolean }>('restaurant-users/follow', {
    method: 'POST',
    body: JSON.stringify({ user_id: targetUserId }),
    withAuth: true,
  })
  unwrapEnvelope(envelope)
}

export async function unfollowRestaurantUser(targetUserId: string): Promise<void> {
  const envelope = await tastyplatesFetch<{ unfollowed: boolean }>('restaurant-users/unfollow', {
    method: 'POST',
    body: JSON.stringify({ user_id: targetUserId }),
    withAuth: true,
  })
  unwrapEnvelope(envelope)
}
