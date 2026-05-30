import { useCallback, useEffect, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import * as Haptics from 'expo-haptics'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReplyItem } from '@/components/review/ReplyItem'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import { errorOccurred } from '@/constants/messages'
import { reviewDescriptionDisplayLimit } from '@/constants/validation'
import { useAuth } from '@/hooks/useAuth'
import { useNhostSession } from '@/hooks/useNhostSession'
import { pushLoginScreen } from '@/lib/authRoutes'
import { nhost } from '@/lib/nhost'
import { fetchReviewById } from '@/services/reviewDetailService'
import { reviewService, type ReplyRow } from '@/services/reviewService'
import { toast } from '@/utils/toast'

const NEUSANS = 'Neusans'
const COMMENT_COOLDOWN_SEC = 5

function singleParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

export default function ReviewCommentsScreen() {
  const insets = useSafeAreaInsets()
  const rawReviewId = useLocalSearchParams<{ reviewId?: string | string[] }>().reviewId
  const reviewId = singleParam(rawReviewId)?.trim() ?? ''

  const { isAuthenticated } = useAuth()
  const { authUser, profile } = useNhostSession()

  const [restaurantUuid, setRestaurantUuid] = useState<string | null>(null)
  const [replies, setReplies] = useState<ReplyRow[]>([])
  const [replyLikes, setReplyLikes] = useState<Record<string, number>>({})
  const [replyUserLiked, setReplyUserLiked] = useState<Record<string, boolean>>({})
  const [replyLikeBusy, setReplyLikeBusy] = useState<Record<string, boolean>>({})
  const [commentText, setCommentText] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const replyLikeInFlight = useRef<Record<string, boolean>>({})

  const promptSignIn = useCallback(() => {
    pushLoginScreen(router, {
      resume: reviewId ? `/(tabs)/reviews/${reviewId}/comments` : '/(tabs)',
    })
  }, [reviewId])

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

  const loadReplies = useCallback(
    async (options?: { pull?: boolean }) => {
      if (!reviewId) return
      if (options?.pull) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [reviewRow, data] = await Promise.all([
          fetchReviewById(reviewId),
          reviewService.fetchCommentReplies(reviewId, { limit: 100 }),
        ])
        setRestaurantUuid(reviewRow.restaurant_uuid)
        setReplies(data.replies)
        setTotalCount(data.meta.total)
        syncReplyLikeMaps(data.replies)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load comments')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [reviewId, syncReplyLikeMaps],
  )

  useEffect(() => {
    void loadReplies()
  }, [loadReplies])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(COMMENT_COOLDOWN_SEC)
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
    if (!restaurantUuid) {
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
        username: profile?.displayName ?? null,
        palates: null,
        user: {
          avatarUrl: profile?.avatarUrl ?? null,
          displayName: profile?.displayName ?? null,
          email: authUser.email ?? null,
        },
      },
    }

    setSubmitting(true)
    setReplies((prev) => [optimisticReply, ...prev])
    setTotalCount((n) => n + 1)
    setCommentText('')
    startCooldown()
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    try {
      const result = await reviewService.createComment({
        parent_review_id: reviewId,
        content: trimmed,
        restaurant_uuid: restaurantUuid,
      })

      const confirmed = result.comment as ReplyRow
      setReplies((prev) =>
        prev.map((row) =>
          row.id === optimisticId
            ? {
                ...confirmed,
                AuthorProfile: optimisticReply.AuthorProfile,
              }
            : row,
        ),
      )
      setReplyLikes((m) => ({ ...m, [confirmed.id]: confirmed.likes_count ?? 0 }))
      setReplyUserLiked((m) => ({ ...m, [confirmed.id]: false }))
    } catch {
      setReplies((prev) => prev.filter((row) => row.id !== optimisticId))
      setTotalCount((n) => Math.max(0, n - 1))
      toast.error(errorOccurred)
    } finally {
      setSubmitting(false)
    }
  }, [
    authUser,
    commentText,
    cooldown,
    isAuthenticated,
    profile,
    promptSignIn,
    restaurantUuid,
    reviewId,
    startCooldown,
    submitting,
  ])

  const canSend = commentText.trim().length > 0 && cooldown === 0 && !submitting
  const userAvatar = profile?.avatarUrl?.trim()

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Comments (${totalCount})`,
          headerBackTitle: 'Back',
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {loading && replies.length === 0 ? (
          <View style={{ flex: 1, padding: 16 }}>
            <ReplySkeleton count={3} />
          </View>
        ) : error && replies.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontFamily: NEUSANS, color: TEXT_MUTED, textAlign: 'center' }}>{error}</Text>
            <Pressable onPress={() => void loadReplies()} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: NEUSANS, color: BRAND_PRIMARY }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={replies}
            estimatedItemSize={72}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadReplies({ pull: true })}
                tintColor={BRAND_PRIMARY}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <Text style={{ fontFamily: NEUSANS, fontSize: 16, fontWeight: '500', color: '#374151' }}>
                    No Comments Yet
                  </Text>
                  <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                    Be the first to comment!
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <ReplyItem
                reply={item}
                likesCount={replyLikes[item.id]}
                userLiked={replyUserLiked[item.id]}
                isLikeLoading={replyLikeBusy[item.id]}
                onLike={handleReplyLike}
                isAuthenticated={isAuthenticated}
                onAuthRequired={promptSignIn}
              />
            )}
          />
        )}

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: '#fff',
          }}
        >
          {isAuthenticated ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb' }}
                />
              ) : (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="user" size={16} color={TEXT_MUTED} />
                </View>
              )}

              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder={
                  cooldown > 0
                    ? `Please wait ${cooldown}s before commenting again...`
                    : 'Add a comment...'
                }
                placeholderTextColor="#9ca3af"
                maxLength={reviewDescriptionDisplayLimit}
                editable={cooldown === 0 && !submitting}
                onSubmitEditing={() => void handleCommentSubmit()}
                returnKeyType="send"
                style={{
                  flex: 1,
                  fontFamily: NEUSANS,
                  fontSize: 14,
                  color: '#31343F',
                  paddingVertical: 8,
                }}
              />

              <Pressable
                onPress={() => void handleCommentSubmit()}
                disabled={!canSend}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Send comment"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <AppIcon name="send" size={20} color={canSend ? '#3b82f6' : '#d1d5db'} />
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={promptSignIn} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#6b7280' }}>
                Sign in to like or comment{' '}
                <Text style={{ color: '#3b82f6' }}>Sign in</Text>
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  )
}
