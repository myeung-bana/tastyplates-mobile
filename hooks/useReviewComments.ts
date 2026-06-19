import { useCallback, useEffect, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { router, type Router } from 'expo-router'

import { errorOccurred } from '@/constants/messages'
import { SCREEN_HOME, SCREEN_REVIEW_COMMENTS } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useNhostSession } from '@/hooks/useNhostSession'
import { pushLoginScreen } from '@/lib/authRoutes'
import { nhost } from '@/lib/nhost'
import { fetchReviewById } from '@/services/reviewDetailService'
import { reviewService, type ReplyRow } from '@/services/reviewService'
import { toast } from '@/utils/toast'

export const REVIEW_COMMENT_COOLDOWN_SEC = 5

export interface UseReviewCommentsOptions {
  reviewId: string
  restaurantUuid?: string | null
  initialTotalCount?: number
  replyLimit?: number
  enabled?: boolean
  resumePath?: Parameters<Router['replace']>[0]
  onCommentsChange?: (payload: { replies: ReplyRow[]; totalCount: number }) => void
}

export function useReviewComments({
  reviewId,
  restaurantUuid: restaurantUuidProp,
  initialTotalCount = 0,
  replyLimit = 100,
  enabled = true,
  resumePath,
  onCommentsChange,
}: UseReviewCommentsOptions) {
  const { isAuthenticated } = useAuth()
  const { authUser, profile } = useNhostSession()

  const [restaurantUuid, setRestaurantUuid] = useState<string | null>(restaurantUuidProp ?? null)
  const [replies, setReplies] = useState<ReplyRow[]>([])
  const [replyLikes, setReplyLikes] = useState<Record<string, number>>({})
  const [replyUserLiked, setReplyUserLiked] = useState<Record<string, boolean>>({})
  const [replyLikeBusy, setReplyLikeBusy] = useState<Record<string, boolean>>({})
  const [commentText, setCommentText] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [error, setError] = useState<string | null>(null)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const replyLikeInFlight = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (restaurantUuidProp) setRestaurantUuid(restaurantUuidProp)
  }, [restaurantUuidProp])

  useEffect(() => {
    setTotalCount(initialTotalCount)
  }, [initialTotalCount, reviewId])

  const notifyChange = useCallback(
    (nextReplies: ReplyRow[], nextTotal: number) => {
      onCommentsChange?.({ replies: nextReplies, totalCount: nextTotal })
    },
    [onCommentsChange],
  )

  const promptSignIn = useCallback(() => {
    pushLoginScreen(router, {
      resume:
        resumePath ??
        (reviewId
          ? { pathname: SCREEN_REVIEW_COMMENTS, params: { reviewId } }
          : SCREEN_HOME),
    })
  }, [resumePath, reviewId])

  const syncReplyLikeMaps = useCallback((rows: ReplyRow[]) => {
    const likes: Record<string, number> = {}
    const liked: Record<string, boolean> = {}
    rows.forEach((row) => {
      likes[row.id] = row.likes_count ?? 0
      liked[row.id] = Boolean(row.user_liked)
    })
    setReplyLikes(likes)
    setReplyUserLiked(liked)
  }, [])

  const applyReplies = useCallback(
    (nextReplies: ReplyRow[], nextTotal: number) => {
      setReplies(nextReplies)
      setTotalCount(nextTotal)
      notifyChange(nextReplies, nextTotal)
    },
    [notifyChange],
  )

  const loadReplies = useCallback(
    async (options?: { pull?: boolean }) => {
      if (!reviewId || !enabled) return
      if (options?.pull) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const needsRestaurantUuid = !restaurantUuidProp && !restaurantUuid
        const [reviewRow, data] = await Promise.all([
          needsRestaurantUuid ? fetchReviewById(reviewId) : Promise.resolve(null),
          reviewService.fetchCommentReplies(reviewId, { limit: replyLimit }),
        ])
        if (reviewRow?.restaurant_uuid) {
          setRestaurantUuid(reviewRow.restaurant_uuid)
        }
        applyReplies(data.replies, data.meta.total)
        syncReplyLikeMaps(data.replies)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load comments')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      applyReplies,
      enabled,
      replyLimit,
      restaurantUuid,
      restaurantUuidProp,
      reviewId,
      syncReplyLikeMaps,
    ],
  )

  useEffect(() => {
    if (!enabled || !reviewId) return
    void loadReplies()
  }, [enabled, reviewId, loadReplies])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(REVIEW_COMMENT_COOLDOWN_SEC)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          cooldownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleReplyLike = useCallback(
    (reply: ReplyRow) => {
      const id = reply.id
      if (id.startsWith('optimistic-') || replyLikeInFlight.current[id]) return

      const currentLiked = replyUserLiked[id] ?? false
      const currentCount = replyLikes[id] ?? reply.likes_count ?? 0

      replyLikeInFlight.current[id] = true
      setReplyLikeBusy((m) => ({ ...m, [id]: true }))
      setReplyUserLiked((m) => ({ ...m, [id]: !currentLiked }))
      setReplyLikes((m) => ({
        ...m,
        [id]: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
      }))

      void reviewService
        .toggleReviewLike(id)
        .then((result) => {
          setReplyUserLiked((m) => ({ ...m, [id]: result.liked }))
        })
        .catch(() => {
          setReplyUserLiked((m) => ({ ...m, [id]: currentLiked }))
          setReplyLikes((m) => ({ ...m, [id]: currentCount }))
        })
        .finally(() => {
          replyLikeInFlight.current[id] = false
          setReplyLikeBusy((m) => ({ ...m, [id]: false }))
        })
    },
    [replyLikes, replyUserLiked],
  )

  const handleCommentSubmit = useCallback(async () => {
    const trimmed = commentText.trim()
    if (!trimmed || submitting || cooldown > 0 || !reviewId) return

    if (!isAuthenticated || !authUser?.id) {
      promptSignIn()
      return
    }

    const restaurantId = restaurantUuidProp ?? restaurantUuid
    if (!restaurantId) {
      toast.error(errorOccurred)
      return
    }

    const token = nhost.auth.getSession()?.accessToken
    if (!token) {
      promptSignIn()
      return
    }

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticReply: ReplyRow = {
      id: optimisticId,
      author_id: authUser.id,
      content: trimmed,
      likes_count: 0,
      user_liked: false,
      created_at: new Date().toISOString(),
      AuthorProfile: {
        user_id: authUser.id,
        username: profile?.username ?? null,
        palates: null,
        user: {
          avatarUrl: profile?.avatarUrl ?? null,
          displayName: profile?.displayName ?? null,
          email: authUser.email ?? null,
        },
      },
    }

    const prevReplies = replies
    const prevTotal = totalCount

    setSubmitting(true)
    const optimisticReplies = [optimisticReply, ...prevReplies]
    applyReplies(optimisticReplies, prevTotal + 1)
    setReplyLikes((m) => ({ ...m, [optimisticId]: 0 }))
    setReplyUserLiked((m) => ({ ...m, [optimisticId]: false }))
    setCommentText('')
    startCooldown()
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    try {
      const result = await reviewService.createComment({
        parent_review_id: reviewId,
        content: trimmed,
        restaurant_uuid: restaurantId,
      })

      const confirmed = result.comment as ReplyRow
      const confirmedReplies = optimisticReplies.map((row) =>
        row.id === optimisticId
          ? { ...confirmed, AuthorProfile: optimisticReply.AuthorProfile }
          : row,
      )
      applyReplies(confirmedReplies, prevTotal + 1)
      setReplyLikes((m) => {
        const next = { ...m }
        delete next[optimisticId]
        next[confirmed.id] = confirmed.likes_count ?? 0
        return next
      })
      setReplyUserLiked((m) => {
        const next = { ...m }
        delete next[optimisticId]
        next[confirmed.id] = false
        return next
      })
    } catch {
      applyReplies(
        prevReplies.filter((row) => row.id !== optimisticId),
        prevTotal,
      )
      toast.error(errorOccurred)
    } finally {
      setSubmitting(false)
    }
  }, [
    applyReplies,
    authUser,
    commentText,
    cooldown,
    isAuthenticated,
    profile,
    promptSignIn,
    replies,
    restaurantUuid,
    restaurantUuidProp,
    reviewId,
    startCooldown,
    submitting,
    totalCount,
  ])

  const canSend = commentText.trim().length > 0 && cooldown === 0 && !submitting

  return {
    isAuthenticated,
    profile,
    replies,
    replyLikes,
    replyUserLiked,
    replyLikeBusy,
    commentText,
    setCommentText,
    cooldown,
    submitting,
    loading,
    refreshing,
    totalCount,
    error,
    canSend,
    loadReplies,
    handleReplyLike,
    handleCommentSubmit,
    promptSignIn,
  }
}

export type UseReviewCommentsResult = ReturnType<typeof useReviewComments>
