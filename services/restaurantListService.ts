/**
 * Service layer for user-curated restaurant playlists.
 * Wraps the `restaurant-lists/*` Nhost Functions using `tastyplatesFetch`.
 */
import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { RestaurantListSummary, RestaurantListDetail } from '@/types/restaurantList'

// ── Types matching API payloads ───────────────────────────────────────────────

export interface CreateListBody {
  title: string
  description?: string
  is_public?: boolean
}

export interface UpdateListBody {
  list_uuid: string
  title?: string
  description?: string
  is_public?: boolean
}

export interface AddItemBody {
  list_uuid: string
  restaurant_uuid?: string
  google_place_id?: string
}

export interface RemoveItemBody {
  list_uuid: string
  item_id: number
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function authGet<T>(path: string): Promise<T> {
  const env = await tastyplatesFetch<T>(path, { withAuth: true })
  return unwrapEnvelope(env)
}

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const env = await tastyplatesFetch<T>(path, {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify(body),
  })
  return unwrapEnvelope(env)
}

async function authPatch<T>(path: string, body: unknown): Promise<T> {
  const env = await tastyplatesFetch<T>(path, {
    method: 'PATCH',
    withAuth: true,
    body: JSON.stringify(body),
  })
  return unwrapEnvelope(env)
}

async function authDelete<T>(path: string, body: unknown): Promise<T> {
  const env = await tastyplatesFetch<T>(path, {
    method: 'DELETE',
    withAuth: true,
    body: JSON.stringify(body),
  })
  return unwrapEnvelope(env)
}

// ── API functions ─────────────────────────────────────────────────────────────

export interface ClaimListsBody {
  list_uuids: string[]
}

export interface ClaimListsResult {
  owner_id: string
  claimed: Array<{ uuid: string; title: string; owner_id: string }>
  claimed_count: number
  skipped_count: number
}

/**
 * Assigns owner_id to lists that were created without one (Hasura Console, etc.).
 * owner_id is set to the authenticated user's id (auth.users.id).
 */
export async function claimLists(body: ClaimListsBody): Promise<ClaimListsResult> {
  return authPost<ClaimListsResult>('restaurant-lists/claim-lists', body)
}

/** Returns all lists owned by the authenticated user (owner_id = JWT user id). */
export async function getMyLists(): Promise<RestaurantListSummary[]> {
  const data = await authGet<RestaurantListSummary[]>('restaurant-lists/get-my-lists')
  if (!Array.isArray(data)) {
    throw new Error('Invalid lists response')
  }
  return data.map((list) => ({
    ...list,
    items_count: typeof list.items_count === 'number' ? list.items_count : 0,
    display_pic: list.display_pic?.trim() || null,
    cover_image_url: list.display_pic?.trim() || list.cover_image_url || null,
  }))
}

/** Creates a new list. Returns the created list summary including share_token. */
export async function createList(body: CreateListBody): Promise<RestaurantListSummary> {
  const data = await authPost<{ list: RestaurantListSummary }>('restaurant-lists/create-list', body)
  return data.list
}

/** Updates title, description, and/or is_public of a list. */
export async function updateList(body: UpdateListBody): Promise<{ list: unknown }> {
  return authPatch<{ list: unknown }>('restaurant-lists/update-list', body)
}

/** Permanently deletes a list and all its items. */
export async function deleteList(listUuid: string): Promise<void> {
  await authDelete<{ deleted: boolean }>('restaurant-lists/delete-list', { list_uuid: listUuid })
}

/** Fetches full list detail including enriched items. Auth optional — public lists work without. */
export async function getListBySlug(slug: string): Promise<RestaurantListDetail> {
  const env = await tastyplatesFetch<{ list: RestaurantListDetail }>(
    `restaurant-lists/get-list-by-slug?slug=${encodeURIComponent(slug)}`,
    { withAuth: true },
  )
  const data = unwrapEnvelope(env)
  return data.list
}

/** Adds a restaurant to a list. Throws with HTTP 409 text when already present. */
export async function addListItem(body: AddItemBody): Promise<{ item: unknown }> {
  return authPost<{ item: unknown }>('restaurant-lists/add-item', body)
}

/** Removes an item from a list. */
export async function removeListItem(body: RemoveItemBody): Promise<void> {
  await authDelete<{ deleted: boolean }>('restaurant-lists/remove-item', body)
}

/** Generates a new share token for a list, invalidating the previous one. */
export async function regenerateShareToken(listUuid: string): Promise<{ share_token: string }> {
  const data = await authPost<{ list: { share_token: string } }>(
    'restaurant-lists/regenerate-share-token',
    { list_uuid: listUuid },
  )
  return { share_token: data.list.share_token }
}
