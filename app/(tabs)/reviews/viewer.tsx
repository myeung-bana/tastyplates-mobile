import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'

import { ReplyItem } from '@/components/review/ReplyItem'
import { ReviewDetailImages } from '@/components/review/ReviewDetailImages'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_HASHTAG_FEED,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_PUBLIC_PROFILE,
  SCREEN_REVIEW_COMMENTS,
} from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useReviewLike } from '@/hooks/useReviewLike'
import { parseProfilePalates } from '@/lib/profileFormatting'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { reviewHashtagLabels, reviewImageUris } from '@/lib/reviewDisplayUtils'
import { capitalizeWords, formatLikeCount, formatRelativeTime } from '@/lib/utils'
import { pushLoginScreen } from '@/lib/authRoutes'
import {
  fetchRestaurantBriefByUuid,
  fetchReviewById,
  type ReviewDetailRow,
} from '@/services/reviewDetailService'
import { reviewService, type ReplyRow } from '@/services/reviewService'
import type { RestaurantUserRow } from '@/services/restaurantUserService'
import {
  fetchRestaurantUserById,
  isRestaurantUserRouteId,
  normalizeLegacyProfileAvatar,
} from '@/services/restaurantUserService'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80'

const NEUSANS = 'Neusans'

function authorDisplayName(author: RestaurantUserRow): string {
  const u = author.username?.trim()
  if (u) return u.startsWith('@') ? u : `@${u}`
  const dn = author.display_name?.trim()
  if (dn) return dn
  const email = author.email?.trim()
  if (email?.includes('@')) return email.split('@')[0] ?? 'Member'
  return 'Member'
}

function openAuthorProfile(author: RestaurantUserRow, authorUuid: string) {
  void Haptics.selectionAsync()
  const usernameSlug = author.username?.trim().replace(/^@/, '')
  if (usernameSlug) {
    router.push({
      pathname: SCREEN_PUBLIC_PROFILE,
      params: { userId: usernameSlug },
    })
    return
  }
  if (authorUuid && isRestaurantUserRouteId(authorUuid)) {
    router.push({
      pathname: SCREEN_PUBLIC_PROFILE,
      params: { userId: authorUuid },
    })
  }
}

interface ReviewViewerBodyProps {
  review: ReviewDetailRow
  author: RestaurantUserRow | null
  restaurantBrief: { title: string | null; slug: string | null } | null
  initialLiked: boolean
}

function ReviewViewerBody({
  review,
  author,
  restaurantBrief,
  initialLiked,
}: ReviewViewerBodyProps) {
  const { isAuthenticated } = useAuth()

  const [previewReplies, setPreviewReplies] = useState<ReplyRow[]>([])
  const [commentsTotal, setCommentsTotal] = useState(review.replies_count ?? 0)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [replyLikes, setReplyLikes] = useState<Record<string, number>>({})
  const [replyUserLiked, setReplyUserLiked] = useState<Record<string, boolean>>({})
  const replyLikeInFlight = useRef<Record<string, boolean>>({})

  const promptSignIn = useCallback(() => {
    pushLoginScreen(router, { resume: '/(tabs)' })
  }, [])

  const { isLiked, likesCount, toggleLike } = useReviewLike({
    reviewId: review.id,
    initialLiked,
    initialCount: review.likes_count ?? 0,
    onAuthRequired: promptSignIn,
  })

  useEffect(() => {
    let cancelled = false
    setCommentsLoading(true)
    void reviewService
      .fetchCommentReplies(review.id, { limit: 2 })
      .then((data) => {
        if (cancelled) return
        setPreviewReplies(data.replies)
        setCommentsTotal(data.meta.total)
        const likes: Record<string, number> = {}
        const liked: Record<string, boolean> = {}
        data.replies.forEach((row) => {
          likes[row.id] = row.likes_count ?? 0
          liked[row.id] = Boolean(row.user_liked)
        })
        setReplyLikes(likes)
        setReplyUserLiked(liked)
      })
      .catch(() => {
        if (!cancelled) setPreviewReplies([])
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [review.id])

  const handleReplyLike = useCallback(
    (reply: ReplyRow) => {
      if (!isAuthenticated) {
        promptSignIn()
        return
      }
      const id = reply.id
      if (replyLikeInFlight.current[id]) return

      const currentLiked = replyUserLiked[id] ?? false
      const currentCount = replyLikes[id] ?? reply.likes_count ?? 0

      replyLikeInFlight.current[id] = true
      setReplyUserLiked((m) => ({ ...m, [id]: !currentLiked }))
      setReplyLikes((m) => ({
        ...m,
        [id]: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
      }))

      void reviewService
        .toggleReviewLike(id)
        .then((result) => setReplyUserLiked((m) => ({ ...m, [id]: result.liked })))
        .catch(() => {
          setReplyUserLiked((m) => ({ ...m, [id]: currentLiked }))
          setReplyLikes((m) => ({ ...m, [id]: currentCount }))
        })
        .finally(() => {
          replyLikeInFlight.current[id] = false
        })
    },
    [isAuthenticated, promptSignIn, replyLikes, replyUserLiked],
  )

  const imageUris = reviewImageUris(review.images, 8)
  const title = capitalizeWords(stripHtml(review.title ?? '').trim())
  const body = capitalizeWords(stripHtml(review.content ?? '').trim())
  const hashtags = reviewHashtagLabels(review.hashtags, 12)
  const palates = useMemo(() => {
    const fromProfile = author ? parseProfilePalates(author.palates) : []
    const fromReview = parseProfilePalates(review.palates)
    const list = fromProfile.length > 0 ? fromProfile : fromReview
    return list.slice(0, 2)
  }, [author, review.palates])
  const when = formatRelativeTime(review.published_at ?? review.created_at ?? new Date())

  const authorAvatarUrl = author
    ? normalizeLegacyProfileAvatar(author.avatarUrl ?? null, author.profile_image)
    : null

  const metaBits: string[] = []
  if (review.replies_count != null && review.replies_count > 0) {
    metaBits.push(`${review.replies_count} repl${review.replies_count === 1 ? 'y' : 'ies'}`)
  }
  metaBits.push(when)

  const statusLabel =
    review.status && review.status !== 'approved' ? review.status.replace(/_/g, ' ') : null

  const openComments = () => {
    void Haptics.selectionAsync()
    router.push({
      pathname: SCREEN_REVIEW_COMMENTS,
      params: { reviewId: review.id },
    })
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <ReviewDetailImages images={imageUris} fallbackUri={DEFAULT_COVER} />

      <View className="border-b px-5 py-5" style={{ borderBottomColor: BORDER_SUBTLE }}>
        <View className="mb-3 flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open reviewer profile"
            hitSlop={6}
            onPress={() => {
              if (!author) return
              if (!isAuthenticated) {
                promptSignIn()
                return
              }
              openAuthorProfile(author, review.author_id)
            }}
            className="active:opacity-80"
          >
            {authorAvatarUrl ? (
              <Image
                accessibilityIgnoresInvertColors
                source={{ uri: authorAvatarUrl }}
                className="rounded-full bg-gray-200"
                style={{ width: 44, height: 44 }}
              />
            ) : (
              <View
                className="items-center justify-center rounded-full bg-gray-100"
                style={{ width: 44, height: 44 }}
              >
                <AppIcon name="user" size={22} color={TEXT_MUTED} />
              </View>
            )}
          </Pressable>

          <View className="min-w-0 flex-1">
            <Pressable
              onPress={() => {
                if (!author) return
                if (!isAuthenticated) {
                  promptSignIn()
                  return
                }
                openAuthorProfile(author, review.author_id)
              }}
              disabled={!author}
              className="active:opacity-80"
            >
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Text
                  className="text-base font-semibold"
                  style={{ color: TEXT_HEADING }}
                  numberOfLines={1}
                >
                  {author ? authorDisplayName(author) : 'Member'}
                </Text>
                {palates.map((label) => (
                  <View
                    key={label}
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: '#f3f4f6' }}
                  >
                    <Text className="font-neusans text-[11px]" style={{ color: TEXT_BODY }}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              <Text className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }} numberOfLines={1}>
                {metaBits.join(' · ')}
              </Text>
            </Pressable>
          </View>

          <RatingDisplay size="md" value={review.rating} />
        </View>

        {restaurantBrief?.title ? (
          <Pressable
            accessibilityRole={restaurantBrief.slug ? 'button' : 'none'}
            accessibilityLabel={
              restaurantBrief.slug ? `Open restaurant ${restaurantBrief.title}` : undefined
            }
            onPress={() => {
              const slug = restaurantBrief.slug?.trim()
              if (!slug) return
              void Haptics.selectionAsync()
              router.push({
                pathname: SCREEN_RESTAURANT_DETAIL,
                params: { slug },
              })
            }}
            disabled={!restaurantBrief.slug}
            className="mb-3 flex-row items-center gap-1 self-start active:opacity-80"
          >
            <AppIcon name="restaurant" size={18} color={TEXT_MUTED} />
            <Text
              className="text-[15px] font-medium underline"
              style={{ color: TEXT_MUTED }}
              numberOfLines={2}
            >
              {restaurantBrief.title}
            </Text>
            {restaurantBrief.slug ? (
              <AppIcon name="chevron-right" size={16} color={TEXT_MUTED} />
            ) : null}
          </Pressable>
        ) : null}

        {statusLabel ? (
          <View
            className="mb-3 self-start rounded-full px-3 py-1"
            style={{ backgroundColor: '#fef3e7', borderWidth: 1, borderColor: '#fde4c9' }}
          >
            <Text className="text-xs font-medium capitalize" style={{ color: TEXT_HEADING }}>
              {statusLabel}
            </Text>
          </View>
        ) : null}

        {title ? (
          <Text className="mb-2 text-xl font-semibold leading-snug" style={{ color: TEXT_HEADING }}>
            {title}
          </Text>
        ) : null}

        {body ? (
          <Text className="text-base leading-relaxed" style={{ color: TEXT_BODY }}>
            {body}
          </Text>
        ) : (
          <Text className="text-base italic leading-relaxed" style={{ color: TEXT_MUTED }}>
            No written review.
          </Text>
        )}

        {hashtags.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {hashtags.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  void Haptics.selectionAsync()
                  router.push({
                    pathname: SCREEN_HASHTAG_FEED,
                    params: { hashtag: t },
                  })
                }}
                accessibilityRole="button"
                accessibilityLabel={`Hashtag ${t}`}
                className="rounded-full border px-3 py-1.5 active:opacity-80"
                style={{ borderColor: BORDER_SUBTLE, backgroundColor: '#fafafa' }}
              >
                <Text className="text-sm" style={{ color: TEXT_BODY }}>
                  #{t}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View
          className="mt-5 flex-row items-center gap-2 border-t pt-4"
          style={{ borderTopColor: BORDER_SUBTLE }}
        >
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              toggleLike()
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Unlike review' : 'Like review'}
            className="flex-row items-center gap-1.5 active:opacity-80"
          >
            <AppIcon
              name="heart"
              active={isLiked}
              size={24}
              color={isLiked ? BRAND_PRIMARY : '#31343F'}
            />
            {likesCount > 0 ? (
              <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#31343F' }}>
                {formatLikeCount(likesCount)}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View className="px-5 pt-4">
        {commentsLoading ? (
          <ReplySkeleton count={2} />
        ) : previewReplies.length === 0 ? (
          <View className="items-center py-6">
            <Text style={{ fontFamily: NEUSANS, fontSize: 16, fontWeight: '500', color: '#374151' }}>
              No Comments Yet
            </Text>
            <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              Be the first to comment!
            </Text>
          </View>
        ) : (
          previewReplies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              likesCount={replyLikes[reply.id]}
              userLiked={replyUserLiked[reply.id]}
              onLike={handleReplyLike}
              isAuthenticated={isAuthenticated}
              onAuthRequired={promptSignIn}
            />
          ))
        )}

        <Pressable
          onPress={openComments}
          accessibilityRole="button"
          accessibilityLabel={`View all comments, ${commentsTotal} total`}
          className="mt-2 w-full items-center active:opacity-90"
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 50,
            paddingVertical: 12,
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#31343F' }}>
            View All Comments ({commentsTotal})
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

export default function ReviewViewerScreen() {
  const rawId = useLocalSearchParams<{ reviewId?: string | string[] }>().reviewId
  const { reviewId, paramError } = useMemo(() => {
    const r = rawId === undefined ? undefined : Array.isArray(rawId) ? rawId[0] : rawId
    const s = typeof r === 'string' ? r.trim() : ''
    if (!s) return { reviewId: null as string | null, paramError: 'Missing review' as string | null }
    if (!UUID_RE.test(s)) return { reviewId: null, paramError: 'Invalid review link' }
    return { reviewId: s, paramError: null }
  }, [rawId])

  const { isAuthenticated, user } = useAuth()

  const [review, setReview] = useState<ReviewDetailRow | null>(null)
  const [restaurantBrief, setRestaurantBrief] = useState<{
    title: string | null
    slug: string | null
  } | null>(null)
  const [author, setAuthor] = useState<RestaurantUserRow | null>(null)
  const [initialLiked, setInitialLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = reviewId
    if (!id) {
      setLoading(false)
      setReview(null)
      setRestaurantBrief(null)
      setAuthor(null)
      setError(null)
      return
    }

    let cancelled = false

    async function load(loadedReviewId: string) {
      setLoading(true)
      setError(null)
      try {
        const r = await fetchReviewById(loadedReviewId)
        if (cancelled) return
        setReview(r)

        const [brief, userResult, liked] = await Promise.all([
          fetchRestaurantBriefByUuid(r.restaurant_uuid),
          fetchRestaurantUserById(r.author_id).catch(() => null),
          isAuthenticated && user?.id
            ? reviewService.checkReviewLike(loadedReviewId, user.id)
            : Promise.resolve(Boolean(r.user_liked)),
        ])
        if (cancelled) return
        setRestaurantBrief(brief)
        setAuthor(userResult)
        setInitialLiked(liked)
      } catch (e) {
        if (cancelled) return
        setReview(null)
        setRestaurantBrief(null)
        setAuthor(null)
        setError(e instanceof Error ? e.message : 'Could not load review')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(id)
    return () => {
      cancelled = true
    }
  }, [reviewId, isAuthenticated, user?.id])

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Review" />

      {paramError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
            {paramError}
          </Text>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center pt-8">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base leading-relaxed" style={{ color: TEXT_MUTED }}>
            {error}
          </Text>
        </View>
      ) : review ? (
        <ReviewViewerBody
          review={review}
          author={author}
          restaurantBrief={restaurantBrief}
          initialLiked={initialLiked}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base" style={{ color: TEXT_MUTED }}>
            Something went wrong.
          </Text>
        </View>
      )}
    </View>
  )
}
