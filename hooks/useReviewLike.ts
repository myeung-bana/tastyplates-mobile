import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { reviewService } from '@/services/reviewService'

const LOADING_COOLDOWN_MS = 220

export interface UseReviewLikeOptions {
  reviewId: string
  initialLiked?: boolean
  initialCount?: number
  onAuthRequired?: () => void
  /** Called after server confirms like state so parent lists can sync. */
  onConfirm?: (liked: boolean, likesCount: number, reviewId: string) => void
}

export interface UseReviewLikeResult {
  isLiked: boolean
  likesCount: number
  isLoading: boolean
  toggleLike: () => void
}

/**
 * Optimistic review like toggle — instant UI, background API, revert on failure.
 */
export function useReviewLike({
  reviewId,
  initialLiked = false,
  initialCount = 0,
  onAuthRequired,
  onConfirm,
}: UseReviewLikeOptions): UseReviewLikeResult {
  const { user, isAuthenticated } = useAuth()
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likesCount, setLikesCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const inFlightRef = useRef(false)

  useEffect(() => {
    setIsLiked(initialLiked)
    setLikesCount(initialCount)
  }, [reviewId, initialLiked, initialCount])

  const toggleLike = useCallback(() => {
    if (inFlightRef.current) return

    if (!isAuthenticated || !user?.id) {
      onAuthRequired?.()
      return
    }

    inFlightRef.current = true
    setIsLoading(true)

    const currentLiked = isLiked
    const currentCount = likesCount

    setIsLiked(!currentLiked)
    setLikesCount(currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1)

    const cooldownTimer = setTimeout(() => setIsLoading(false), LOADING_COOLDOWN_MS)

    void reviewService
      .toggleReviewLike(reviewId)
      .then((result) => {
        const confirmedLiked = result.liked
        const confirmedCount = confirmedLiked
          ? currentLiked
            ? currentCount
            : currentCount + 1
          : currentLiked
            ? Math.max(0, currentCount - 1)
            : currentCount
        setIsLiked(confirmedLiked)
        setLikesCount(confirmedCount)
        onConfirm?.(confirmedLiked, confirmedCount, reviewId)
      })
      .catch(() => {
        setIsLiked(currentLiked)
        setLikesCount(currentCount)
      })
      .finally(() => {
        clearTimeout(cooldownTimer)
        setIsLoading(false)
        inFlightRef.current = false
      })
  }, [
    isAuthenticated,
    user?.id,
    isLiked,
    likesCount,
    reviewId,
    onAuthRequired,
    onConfirm,
  ])

  return {
    isLiked,
    likesCount,
    isLoading,
    toggleLike,
  }
}
