/**
 * Cursor-based pagination helpers for review feeds.
 *
 * A review cursor encodes the stable sort key used by the GraphQL query so
 * that the server can resume from exactly the right row without OFFSET.
 */

export interface ReviewCursorPayload {
  /** ISO timestamp of the review (primary sort key). */
  createdAt: string
  /** UUID of the review (tiebreaker). */
  id: string
}

/**
 * Encode a cursor payload to a base64 string safe for URL / GraphQL variables.
 */
export function encodeReviewCursor(payload: ReviewCursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * Decode a base64 cursor string back to its payload.
 * Returns `null` if the cursor is malformed or missing.
 */
export function decodeReviewCursor(cursor: string | null | undefined): ReviewCursorPayload | null {
  if (!cursor) return null
  try {
    const raw = Buffer.from(cursor, 'base64').toString('utf-8')
    const parsed = JSON.parse(raw) as ReviewCursorPayload
    if (!parsed.createdAt || !parsed.id) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Build the Hasura `where` clause fragment for cursor-based pagination.
 * Assumes the query sorts by `(created_at DESC, id DESC)`.
 */
export function buildCursorWhere(cursor: ReviewCursorPayload | null): object | undefined {
  if (!cursor) return undefined
  return {
    _or: [
      { created_at: { _lt: cursor.createdAt } },
      { created_at: { _eq: cursor.createdAt }, id: { _lt: cursor.id } },
    ],
  }
}
