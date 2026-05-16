import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

/** Row from `restaurant-users/get-restaurant-user-by-username` / `get-restaurant-user-by-id`. */
export interface RestaurantUserRow {
  id: string
  username?: string | null
  email?: string | null
  display_name?: string | null
  profile_image?: string | null
  about_me?: string | null
  palates?: unknown
  created_at: string
  /** Present on username endpoint only; may be null. */
  avatarUrl?: string | null
}

export interface GetRestaurantUserByUsernameResponse {
  user: RestaurantUserRow
}

export interface GetRestaurantUserByIdResponse {
  user: RestaurantUserRow
}

const RESTAURANT_USER_ROUTE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `restaurant_users.id` for `/profile/[userId]` segments. */
export function isRestaurantUserRouteId(segment: string): boolean {
  return RESTAURANT_USER_ROUTE_ID_RE.test(segment.trim().replace(/^@/, ''))
}

export async function fetchRestaurantUserByUsername(
  username: string,
): Promise<RestaurantUserRow> {
  const q = new URLSearchParams({ username: username.trim().replace(/^@/, '') })
  const envelope = await tastyplatesFetch<GetRestaurantUserByUsernameResponse>(
    `restaurant-users/get-restaurant-user-by-username?${q.toString()}`,
  )
  return unwrapEnvelope(envelope).user
}

export async function fetchRestaurantUserById(id: string): Promise<RestaurantUserRow> {
  const envelope = await tastyplatesFetch<GetRestaurantUserByIdResponse>(
    `restaurant-users/get-restaurant-user-by-id?id=${encodeURIComponent(id)}`,
  )
  return unwrapEnvelope(envelope).user
}
