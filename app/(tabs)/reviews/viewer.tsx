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
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'

import { ReplyItem } from '@/components/review/ReplyItem'
import {
  ReviewCommentsSheet,
  type ReviewCommentsSheetHandle,
} from '@/components/review/ReviewCommentsSheet'
import { ReviewDetailImages } from '@/components/review/ReviewDetailImages'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
import { RatingDisplay } from '@/components/ui/RatingDisplay'
import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_HASHTAG_FEED,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { useReviewComments } from '@/hooks/useReviewComments'
import { useReviewLike } from '@/hooks/useReviewLike'
import { resolveReviewAuthorPresentation } from '@/lib/reviewAuthorDisplay'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { reviewHashtagLabels, reviewImageUris } from '@/lib/reviewDisplayUtils'
import { capitalizeWords, formatLikeCount, formatRelativeTime } from '@/lib/utils'
import { pushLoginScreen } from '@/lib/authRoutes'
import {
  fetchRestaurantBriefByUuid,
  fetchReviewById,
  type ReviewDetailRow,
} from '@/services/reviewDetailService'
import { reviewService } from '@/services/reviewService'
import type { RestaurantUserRow } from '@/services/restaurantUserService'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80'

const NEUSANS = 'Neusans'

function openReviewAuthorProfile(review: ReviewDetailRow) {
  void Haptics.selectionAsync()
  pushPublicProfile(router, publicProfileFromAuthorFields(review.author_id, review.AuthorProfile))
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
  const commentsSheetRef = useRef<ReviewCommentsSheetHandle>(null)

  const comments = useReviewComments({
    reviewId: review.id,
    restaurantUuid: review.restaurant_uuid,
    initialTotalCount: review.replies_count ?? 0,
    replyLimit: 100,
    resumePath: { pathname: SCREEN_REVIEW_VIEWER, params: { reviewId: review.id } },
  })

  const previewReplies = useMemo(() => comments.replies.slice(0, 2), [comments.replies])

  const promptSignIn = useCallback(() => {
    pushLoginScreen(router, {
      resume: { pathname: SCREEN_REVIEW_VIEWER, params: { reviewId: review.id } },
    })
  }, [review.id])

  const { isLiked, likesCount, toggleLike } = useReviewLike({
    reviewId: review.id,
    initialLiked,
    initialCount: review.likes_count ?? 0,
    onAuthRequired: promptSignIn,
  })

  const openComments = useCallback((focusComposer = false) => {
    void Haptics.selectionAsync()
    commentsSheetRef.current?.present({ focusComposer })
  }, [])

  const imageUris = reviewImageUris(review.images, 8)
  const title = capitalizeWords(stripHtml(review.title ?? '').trim())
  const body = capitalizeWords(stripHtml(review.content ?? '').trim())
  const hashtags = reviewHashtagLabels(review.hashtags, 12)
  const authorPresentation = useMemo(
    () => resolveReviewAuthorPresentation(review, author),
    [review, author],
  )
  const { label: authorLabel, avatarUrl: authorAvatarUrl, palates, canOpenProfile } =
    authorPresentation
  const when = formatRelativeTime(review.published_at ?? review.created_at ?? new Date())

  const metaBits: string[] = []
  if (comments.totalCount > 0) {
    metaBits.push(`${comments.totalCount} repl${comments.totalCount === 1 ? 'y' : 'ies'}`)
  }
  metaBits.push(when)

  const statusLabel =
    review.status && review.status !== 'approved' ? review.status.replace(/_/g, ' ') : null

  const openAuthor = () => {
    if (!canOpenProfile) return
    if (!isAuthenticated) {
      promptSignIn()
      return
    }
    openReviewAuthorProfile(review)
  }

  const openCommentsBrowse = () => openComments(false)
  const openCommentsCompose = () => openComments(true)

  return (
    <>
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
            onPress={openAuthor}
            disabled={!canOpenProfile}
            className="active:opacity-80"
          >
            <ProfileAvatarImage
              size={44}
              avatarUrl={authorAvatarUrl}
              className="rounded-full bg-gray-200"
            />
          </Pressable>

          <View className="min-w-0 flex-1">
            <Pressable
              onPress={openAuthor}
              disabled={!canOpenProfile}
              className="active:opacity-80"
            >
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Text
                  className="text-base font-semibold"
                  style={{ color: TEXT_HEADING }}
                  numberOfLines={1}
                >
                  {authorLabel}
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
          <Pressable
            onPress={openCommentsCompose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${comments.totalCount} comments`}
            className="ml-4 flex-row items-center gap-1.5 active:opacity-80"
          >
            <AppIcon name="message-circle" size={22} color="#31343F" />
            {comments.totalCount > 0 ? (
              <Text style={{ fontFamily: NEUSANS, fontSize: 14, color: '#31343F' }}>
                {formatLikeCount(comments.totalCount)}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View className="px-5 pt-4">
        {comments.loading ? (
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
              likesCount={comments.replyLikes[reply.id]}
              userLiked={comments.replyUserLiked[reply.id]}
              isLikeLoading={comments.replyLikeBusy[reply.id]}
              onLike={comments.handleReplyLike}
              isAuthenticated={isAuthenticated}
              onAuthRequired={promptSignIn}
            />
          ))
        )}

        <Pressable
          onPress={openCommentsBrowse}
          accessibilityRole="button"
          accessibilityLabel={`View all comments, ${comments.totalCount} total`}
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
            View All Comments ({comments.totalCount})
          </Text>
        </Pressable>
      </View>
    </ScrollView>

    <ReviewCommentsSheet ref={commentsSheetRef} comments={comments} />
    </>
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
      <Stack.Screen options={{ headerShown: false }} />
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
