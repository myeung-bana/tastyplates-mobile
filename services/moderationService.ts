import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

export type ReportTargetType = 'review' | 'comment' | 'user' | 'list'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'sexual'
  | 'violence'
  | 'misinformation'
  | 'off_topic'
  | 'impersonation'
  | 'other'

export const REPORT_REASON_OPTIONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech or symbols' },
  { value: 'sexual', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence or dangerous acts' },
  { value: 'misinformation', label: 'False or misleading information' },
  { value: 'off_topic', label: 'Not about this restaurant' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Something else' },
]

export interface BlockedUserEntry {
  blocked_at: string
  user: {
    id: string
    username: string | null
    display_name: string | null
    profile_image: string | null
  }
}

export async function submitContentReport(input: {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details?: string
}): Promise<void> {
  const envelope = await tastyplatesFetch<{ report: { id: string } }>('reports/create-report', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify({
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      details: input.details?.trim() || null,
    }),
  })
  unwrapEnvelope(envelope)
}

export async function blockUser(userId: string): Promise<void> {
  const envelope = await tastyplatesFetch<{ blocked: boolean }>('blocks/block-user', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify({ user_id: userId }),
  })
  unwrapEnvelope(envelope)
}

export async function unblockUser(userId: string): Promise<void> {
  const envelope = await tastyplatesFetch<{ blocked: boolean }>('blocks/unblock-user', {
    method: 'POST',
    withAuth: true,
    body: JSON.stringify({ user_id: userId }),
  })
  unwrapEnvelope(envelope)
}

export async function fetchBlockedUsers(): Promise<BlockedUserEntry[]> {
  const envelope = await tastyplatesFetch<{ blocked: BlockedUserEntry[] }>('blocks/list-blocks', {
    withAuth: true,
  })
  return unwrapEnvelope(envelope).blocked ?? []
}

export async function fetchIsUserBlocked(userId: string): Promise<boolean> {
  const q = new URLSearchParams({ user_id: userId })
  const envelope = await tastyplatesFetch<{ blocked: boolean }>(
    `blocks/list-blocks?${q.toString()}`,
    { withAuth: true },
  )
  return unwrapEnvelope(envelope).blocked === true
}
