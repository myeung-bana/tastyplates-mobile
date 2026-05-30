import {
  listItemAddError,
  listItemDuplicateError,
} from '@/constants/messages'

/** Maps `tastyplatesFetch` / add-item errors to user-facing copy. */
export function listItemAddErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (msg.includes('409') || lower.includes('already in list')) {
    return listItemDuplicateError
  }
  if (msg.includes('404') || lower.includes('list not found')) {
    return 'This list was not found or you do not have permission to edit it.'
  }
  if (msg.includes('422') || lower.includes('capped at')) {
    return msg.replace(/^HTTP \d+:\s*/i, '').trim() || 'This list is full.'
  }
  if (lower.includes('at least one of restaurant_uuid or google_place_id')) {
    return 'Could not identify this place. Try another restaurant.'
  }
  if (msg.startsWith('HTTP ')) {
    const detail = msg.replace(/^HTTP \d+:\s*/i, '').trim()
    return detail || listItemAddError
  }
  return msg.trim() || listItemAddError
}
