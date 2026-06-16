import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export const PROFILE_PUBLIC_LISTS_PREVIEW_LIMIT = 20

export interface ProfilePublicListSummary {
  uuid: string
  slug: string
  title: string
  description: string | null
  owner_id: string
  items_count: number
  display_pic: string | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface FetchUserPublicListsResult {
  lists: ProfilePublicListSummary[]
  meta: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/** Public lists for a profile owner (`restaurant-lists/get-user-public-lists`). */
export async function fetchUserPublicLists(
  ownerId: string,
  options?: { limit?: number; offset?: number },
): Promise<FetchUserPublicListsResult> {
  const limit = Math.min(Math.max(options?.limit ?? PROFILE_PUBLIC_LISTS_PREVIEW_LIMIT, 1), 50)
  const offset = Math.max(options?.offset ?? 0, 0)
  const q = new URLSearchParams({
    owner_id: ownerId,
    limit: String(limit),
    offset: String(offset),
  })
  const envelope = await tastyplatesFetch<FetchUserPublicListsResult>(
    `restaurant-lists/get-user-public-lists?${q}`,
  )
  return unwrapEnvelope(envelope)
}
