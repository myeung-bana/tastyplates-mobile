import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export interface FollowListUser {
  id: string
  username: string | null
  display_name: string | null
  profile_image: string | null
  about_me: string | null
  palates?: unknown
}

export interface FollowListEntry {
  follow_id: string
  followed_at: string
  user: FollowListUser | null
}

const PAGE_SIZE = 100

function listQuery(base: string, userId: string, offset = 0): string {
  const q = new URLSearchParams({
    userId,
    limit: String(PAGE_SIZE),
    offset: String(offset),
  })
  return `${base}?${q.toString()}`
}

export async function fetchFollowersList(
  userId: string,
  offset = 0,
): Promise<FollowListEntry[]> {
  const envelope = await tastyplatesFetch<{ followers: FollowListEntry[] }>(
    listQuery('restaurant-users/get-followers-list', userId, offset),
  )
  return unwrapEnvelope(envelope).followers ?? []
}

export async function fetchFollowingList(
  userId: string,
  offset = 0,
): Promise<FollowListEntry[]> {
  const envelope = await tastyplatesFetch<{ following: FollowListEntry[] }>(
    listQuery('restaurant-users/get-following-list', userId, offset),
  )
  return unwrapEnvelope(envelope).following ?? []
}

/** IDs the viewer follows — used to label rows on someone else's followers list. */
export async function fetchViewerFollowingIds(viewerUserId: string): Promise<Set<string>> {
  const rows = await fetchFollowingList(viewerUserId)
  const ids = new Set<string>()
  for (const row of rows) {
    if (row.user?.id) ids.add(row.user.id)
  }
  return ids
}
