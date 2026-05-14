import { useState, useCallback } from 'react'
import { encodeReviewCursor, type ReviewCursorPayload } from '@/lib/cursor-pagination'

export interface PaginationState {
  cursor: string | null
  hasMore: boolean
}

export interface UsePaginationResult {
  cursor: string | null
  hasMore: boolean
  /** Call with the last item of the current page to advance the cursor. */
  loadMore: (lastItem: ReviewCursorPayload) => void
  /** Reset pagination back to the first page. */
  reset: () => void
  /** Call when a page returns fewer items than the requested limit. */
  markExhausted: () => void
}

/**
 * Cursor-based pagination helper.
 *
 * Manages the cursor state for an infinite-scroll feed.
 * Feed queries should pass `cursor` as the `after` variable and use
 * `limit=16` for feeds, `limit=8` for grids.
 */
export function usePagination(_pageSize: number = 16): UsePaginationResult {
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = useCallback((lastItem: ReviewCursorPayload) => {
    setCursor(encodeReviewCursor(lastItem))
  }, [])

  const reset = useCallback(() => {
    setCursor(null)
    setHasMore(true)
  }, [])

  const markExhausted = useCallback(() => {
    setHasMore(false)
  }, [])

  return { cursor, hasMore, loadMore, reset, markExhausted }
}

/** Default feed page size. */
export const DEFAULT_FEED_PAGE_SIZE = 16
/** Default grid page size. */
export const DEFAULT_GRID_PAGE_SIZE = 8
