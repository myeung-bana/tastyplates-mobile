import { nhost } from '@/lib/nhost'
import { tastyplatesFetch, unwrapEnvelope, getNhostFunctionsBase } from '@/lib/tastyplatesFetch'
import type { HasuraRestaurantRow } from '@/lib/myListsRestaurant'

/** Row from `restaurant-users/get-restaurant-user-by-username` / `get-restaurant-user-by-id`. */
export interface RestaurantUserRow {
  id: string
  username?: string | null
  email?: string | null
  display_name?: string | null
  /** Legacy shapes: bare URL string **or** `{ url }` from Nhost `toLegacyUser`. */
  profile_image?: string | { url?: string | null } | null
  about_me?: string | null
  palates?: unknown
  /** From `user_profiles.onboarding_complete` via Nhost legacy mapper. */
  onboarding_complete?: boolean
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

/** Route segment `[userId]` is UUID (`get-restaurant-user-by-id`) or username (`get-restaurant-user-by-username`). */
export function isRestaurantUserRouteId(segment: string): boolean {
  return RESTAURANT_USER_ROUTE_ID_RE.test(segment.trim().replace(/^@/, ''))
}

/** Resolves avatar from `avatarUrl` and/or legacy `profile_image` (string or `{ url }`). */
export function normalizeLegacyProfileAvatar(
  avatarUrl?: string | null,
  profileImage?: RestaurantUserRow['profile_image'],
): string | null {
  const fromAuth = avatarUrl?.trim()
  if (fromAuth?.startsWith('http')) return fromAuth

  if (profileImage == null || profileImage === '') return null
  if (typeof profileImage === 'string') {
    const s = profileImage.trim()
    return s.startsWith('http') ? s : null
  }
  const urlRaw = profileImage.url
  const nested = typeof urlRaw === 'string' ? urlRaw.trim() : ''
  return nested.startsWith('http') ? nested : null
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

/** Returns null when the profile row does not exist (HTTP 404). */
export async function tryFetchRestaurantUserById(id: string): Promise<RestaurantUserRow | null> {
  const envelope = await tastyplatesFetch<GetRestaurantUserByIdResponse>(
    `restaurant-users/get-restaurant-user-by-id?id=${encodeURIComponent(id)}`,
  )
  if (!envelope.ok) {
    if (envelope.error.includes('404')) return null
    throw new Error(envelope.error)
  }
  return envelope.data.user
}

export interface CreateRestaurantUserParams {
  username: string
  onboarding_complete?: boolean
  palates?: string[]
  about_me?: string | null
}

interface CreateRestaurantUserResponse {
  user: RestaurantUserRow
}

interface EnsureProfileResponse {
  user: RestaurantUserRow
  created: boolean
}

/** Idempotent — creates `user_profiles` with `user_<random>` when missing. */
export async function ensureRestaurantUserProfileApi(): Promise<EnsureProfileResponse> {
  const envelope = await tastyplatesFetch<EnsureProfileResponse>(
    'restaurant-users/ensure-profile',
    {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify({}),
    },
  )
  return unwrapEnvelope(envelope)
}

/** `POST restaurant-users/create-restaurant-user` — JWT user_id only; see api-guide §8.6. */
export async function createRestaurantUserProfile(
  params: CreateRestaurantUserParams,
): Promise<RestaurantUserRow> {
  const body: Record<string, unknown> = {
    username: params.username.trim(),
    onboarding_complete: params.onboarding_complete ?? false,
  }
  if (params.palates !== undefined) body.palates = params.palates
  if (params.about_me !== undefined) body.about_me = params.about_me

  const envelope = await tastyplatesFetch<CreateRestaurantUserResponse>(
    'restaurant-users/create-restaurant-user',
    {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(body),
    },
  )
  return unwrapEnvelope(envelope).user
}

export interface UpdateRestaurantUserProfileParams {
  about_me?: string
  profile_image?: string
  palates?: string[]
  display_name?: string
}

interface UpdateRestaurantUserResponse {
  user: RestaurantUserRow
}

export async function updateRestaurantUserProfile(
  params: UpdateRestaurantUserProfileParams,
): Promise<RestaurantUserRow> {
  const body: Record<string, unknown> = {}
  if (params.about_me !== undefined) body.about_me = params.about_me
  if (params.profile_image !== undefined) body.profile_image = params.profile_image
  if (params.palates !== undefined) body.palates = params.palates
  if (params.display_name !== undefined) body.display_name = params.display_name

  const envelope = await tastyplatesFetch<UpdateRestaurantUserResponse>(
    'restaurant-users/update-restaurant-user',
    {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(body),
    },
  )
  return unwrapEnvelope(envelope).user
}

// ─── Wishlist / Check-ins ──────────────────────────────────────────────────

export interface ListMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface WishlistItem {
  favorite_id: string
  created_at: string
  restaurant: HasuraRestaurantRow | null
}

export interface CheckinItem {
  checkin_id: string
  checked_in_at: string
  restaurant: HasuraRestaurantRow | null
}

export interface GetWishlistResponse {
  items: WishlistItem[]
  meta: ListMeta
}

export interface GetCheckinsResponse {
  items: CheckinItem[]
  meta: ListMeta
}

async function authFetch<T>(path: string): Promise<T> {
  const base = getNhostFunctionsBase()
  const token = nhost.auth.getAccessToken()
  const res = await fetch(`${base}/${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  const envelope = (await res.json()) as { ok: boolean; data?: T; error?: string }
  if (!envelope.ok || !envelope.data) throw new Error(envelope.error ?? 'Unknown error')
  return envelope.data
}

export async function getWishlist(params: {
  user_id: string
  limit?: number
  offset?: number
}): Promise<GetWishlistResponse> {
  const q = new URLSearchParams({ user_id: params.user_id })
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  return authFetch<GetWishlistResponse>(`restaurant-users/get-wishlist?${q.toString()}`)
}

export async function getCheckins(params: {
  user_id: string
  limit?: number
  offset?: number
}): Promise<GetCheckinsResponse> {
  const q = new URLSearchParams({ user_id: params.user_id })
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  return authFetch<GetCheckinsResponse>(`restaurant-users/get-checkins?${q.toString()}`)
}
