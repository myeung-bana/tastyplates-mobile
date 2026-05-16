import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export type FavoriteStatus = 'saved' | 'unsaved'
export type CheckinStatus = 'checkedin' | 'uncheckedin'

export async function getFavoriteStatus(restaurantSlug: string): Promise<FavoriteStatus | null> {
  const env = await tastyplatesFetch<{ status: FavoriteStatus }>(
    `restaurant-users/toggle-favorite?${new URLSearchParams({ restaurant_slug: restaurantSlug })}`,
    { withAuth: true },
  )
  if (!env.ok) return null
  return env.data.status
}

export async function toggleFavoriteBySlug(restaurantSlug: string): Promise<FavoriteStatus> {
  const env = await tastyplatesFetch<{ status: FavoriteStatus; restaurant_uuid: string }>(
    'restaurant-users/toggle-favorite',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_slug: restaurantSlug }),
      withAuth: true,
    },
  )
  return unwrapEnvelope(env).status
}

export async function getCheckinStatus(restaurantSlug: string): Promise<CheckinStatus | null> {
  const env = await tastyplatesFetch<{ status: CheckinStatus }>(
    `restaurant-users/toggle-checkin?${new URLSearchParams({ restaurant_slug: restaurantSlug })}`,
    { withAuth: true },
  )
  if (!env.ok) return null
  return env.data.status
}

export async function toggleCheckinBySlug(restaurantSlug: string): Promise<CheckinStatus> {
  const env = await tastyplatesFetch<{ status: CheckinStatus; restaurant_uuid: string }>(
    'restaurant-users/toggle-checkin',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_slug: restaurantSlug }),
      withAuth: true,
    },
  )
  return unwrapEnvelope(env).status
}
