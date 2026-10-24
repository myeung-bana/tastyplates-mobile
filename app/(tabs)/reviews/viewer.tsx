import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CircleIconButton } from '@/components/navigation/CircleIconButton'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { ReplyItem } from '@/components/review/ReplyItem'
import {
  ReviewCommentsSheet,
  type ReviewCommentsSheetHandle,
} from '@/components/review/ReviewCommentsSheet'
import { ReviewDetailImages } from '@/components/review/ReviewDetailImages'
import { AppIcon } from '@/components/ui/AppIcon'
import { ReplySkeleton } from '@/components/ui/Skeleton/ReplySkeleton'
import { AUTH_WALL } from '@/constants/authWalls'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  BRAND_PRIMARY_TINT,
  SURFACE_CARD,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import {
  SCREEN_HASHTAG_FEED,
  SCREEN_HOME,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { useModeration } from '@/contexts/ModerationContext'
import { useAuth } from '@/hooks/useAuth'
import { useHideTabBarWhileFocused } from '@/hooks/useHideTabBarWhileFocused'
import { useReviewComments } from '@/hooks/useReviewComments'
import { useReviewLike } from '@/hooks/useReviewLike'
import { pushLoginScreen } from '@/lib/authRoutes'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { resolveReviewAuthorPresentation } from '@/lib/reviewAuthorDisplay'
import { reviewHashtagLabels, reviewImageUris } from '@/lib/reviewDisplayUtils'
import { shareRestaurantListing } from '@/lib/shareRestaurantListing'
import { formatLikeCount, formatRelativeTime } from '@/lib/utils'
import {
  fetchRestaurantBriefByUuid,
  fetchReviewById,
  type RestaurantBrief,
  type ReviewDetailRow,
} from '@/services/reviewDetailService'
import { reviewService } from '@/services/reviewService'
import type { RestaurantUserRow } from '@/services/restaurantUserService'
import { fetchRestaurantUserById } from '@/services/restaurantUserService'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80'


const HERO_BELOW_STATUS_BAR = 330
const BOTTOM_BAR_HEIGHT = 50

function openReviewAuthorProfile(review: ReviewDetailRow) {
  void Haptics.selectionAsync()
  pushPublicProfile(router, publicProfileFromAuthorFields(review.author_id, review.AuthorProfile))
}

function Stars({ value }: { value: number }): JSX.Element {
  const filled = Math.round(value)
  return (
    <View className="flex-row items-center" accessibilityLabel={`Rated ${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 15, color: i <= filled ? BRAND_PRIMARY : BORDER_SUBTLE, marginRight: 1 }}>
          ★
        </Text>
      ))}
      <Text style={{ marginLeft: 6, fontFamily: FONT.bodySemibold, fontSize: 15, color: TEXT_HEADING }}>{value.toFixed(1)}</Text>
    </View>
  )
}

interface ReviewViewerBodyProps {
  review: ReviewDetailRow
  author: RestaurantUserRow | null
  restaurantBrief: RestaurantBrief | null
  initialLiked: boolean
}

/** Review viewer (design R2): photo hero, review, first comments, fixed like / comment bar. */
function ReviewViewerBody({
  review,
  author,
  restaurantBrief,
  initialLiked,
}: ReviewViewerBodyProps) {
  const insets = useSafeAreaInsets()
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
      wall: AUTH_WALL.likeComment,
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
  // Title and body keep the author's own casing (design R2).
  const title = stripHtml(review.title ?? '').trim()
  const body = stripHtml(review.content ?? '').trim()
  const hashtags = reviewHashtagLabels(review.hashtags, 12)
  const authorPresentation = useMemo(
    () => resolveReviewAuthorPresentation(review, author),
    [review, author],
  )
  const { label: authorLabel, avatarUrl: authorAvatarUrl, palates, canOpenProfile } =
    authorPresentation
  const when = formatRelativeTime(review.published_at ?? review.created_at ?? new Date())
  const metaLine = [palates[0] ? `${palates[0]} palate` : null, when].filter(Boolean).join(' · ')
  const rating = review.rating != null && review.rating > 0 ? review.rating : null

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

  const restaurantSlug = restaurantBrief?.slug?.trim() ?? ''
  const restaurantLabel = [restaurantBrief?.title, restaurantBrief?.cuisine].filter(Boolean).join(' · ')

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ReviewDetailImages images={imageUris} fallbackUri={DEFAULT_COVER} height={HERO_BELOW_STATUS_BAR + insets.top} />

        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {restaurantLabel ? (
            <Pressable
              accessibilityRole={restaurantSlug ? 'button' : 'none'}
              accessibilityLabel={restaurantSlug ? `Open restaurant ${restaurantBrief?.title}` : undefined}
              disabled={!restaurantSlug}
              onPress={() => {
                void Haptics.selectionAsync()
                router.push({ pathname: SCREEN_RESTAURANT_DETAIL, params: { slug: restaurantSlug } })
              }}
              className="flex-row items-center self-start active:opacity-80"
              style={{ gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
            >
              <AppIcon name="restaurant" size={14} color={TEXT_HEADING} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>
                {restaurantLabel}
              </Text>
              {restaurantSlug ? <AppIcon name="chevron-right" size={14} color={TEXT_HEADING} /> : null}
            </Pressable>
          ) : null}

          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open reviewer profile"
              hitSlop={6}
              onPress={openAuthor}
              disabled={!canOpenProfile}
              className="active:opacity-80"
            >
              <ProfileAvatarImage
                size={36}
                avatarUrl={authorAvatarUrl}
                style={{ backgroundColor: SURFACE_FOG, borderWidth: 1, borderColor: BORDER_SUBTLE }}
              />
            </Pressable>
            <Pressable onPress={openAuthor} disabled={!canOpenProfile} className="min-w-0 flex-1 active:opacity-80" style={{ gap: 3 }}>
              <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>
                {authorLabel}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>
                {metaLine}
              </Text>
            </Pressable>
          </View>

          {statusLabel ? (
            <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: BRAND_PRIMARY_TINT }}>
              <Text className="text-xs capitalize" style={{ fontFamily: FONT.bodyMedium, color: BRAND_PRIMARY_DARK }}>
                {statusLabel}
              </Text>
            </View>
          ) : null}

          {rating != null ? <Stars value={rating} /> : null}

          {title ? (
            <Text style={{ fontFamily: FONT.heading, fontSize: 20, lineHeight: 26, color: TEXT_HEADING }}>{title}</Text>
          ) : null}

          {body ? (
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 23, color: TEXT_HEADING }}>{body}</Text>
          ) : null}

          {hashtags.length > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: 6 }}>
              {hashtags.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    router.push({ pathname: SCREEN_HASHTAG_FEED, params: { hashtag: t } })
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Hashtag ${t}`}
                  className="justify-center active:opacity-80"
                  style={{ height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: SURFACE_FOG }}
                >
                  <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 13, color: TEXT_HEADING }}>#{t}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 18, marginHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER_SUBTLE }}>
          <View className="flex-row items-baseline justify-between">
            <Text
              style={{ fontFamily: FONT.heading, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
            >
              Comments
            </Text>
            {comments.totalCount > 0 ? (
              <Pressable onPress={() => openComments(false)} hitSlop={8} accessibilityRole="button">
                <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: BRAND_PRIMARY_DARK }}>View all comments</Text>
              </Pressable>
            ) : null}
          </View>

          {comments.loading ? (
            <View style={{ paddingTop: 12 }}>
              <ReplySkeleton count={2} />
            </View>
          ) : previewReplies.length === 0 ? (
            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED, paddingVertical: 14 }}>
              No comments yet. Start the conversation.
            </Text>
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
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center"
        style={{
          gap: 22,
          paddingTop: 6,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: SURFACE_CARD,
          borderTopWidth: 1,
          borderTopColor: BORDER_SUBTLE,
        }}
      >
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync()
            toggleLike()
          }}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike review' : 'Like review'}
          className="flex-row items-center active:opacity-80"
          style={{ gap: 6, height: 44 }}
        >
          <AppIcon name="heart" active={isLiked} size={22} color={isLiked ? BRAND_PRIMARY : TEXT_HEADING} />
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>{formatLikeCount(likesCount)}</Text>
        </Pressable>
        <Pressable
          onPress={() => openComments(false)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${comments.totalCount} comments`}
          className="flex-row items-center active:opacity-80"
          style={{ gap: 6, height: 44 }}
        >
          <AppIcon name="message-circle" size={22} color={TEXT_HEADING} />
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>{formatLikeCount(comments.totalCount)}</Text>
        </Pressable>
        <Pressable
          onPress={() => (isAuthenticated ? openComments(true) : promptSignIn())}
          accessibilityRole="button"
          accessibilityLabel="Add a comment"
          className="flex-1 justify-center active:opacity-80"
          style={{ height: 40, borderRadius: 999, backgroundColor: SURFACE_FOG, paddingHorizontal: 16 }}
        >
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_TERTIARY }}>Add a comment…</Text>
        </Pressable>
      </View>

      <ReviewCommentsSheet ref={commentsSheetRef} comments={comments} replyToLabel={authorLabel} />
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
  // The like / comment bar takes the bottom edge (design R2), so the floating tab bar steps aside.
  useHideTabBarWhileFocused()

  const [review, setReview] = useState<ReviewDetailRow | null>(null)
  const [restaurantBrief, setRestaurantBrief] = useState<RestaurantBrief | null>(null)
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

  const { openContentActions, canModerate } = useModeration()
  const insets = useSafeAreaInsets()
  const authorLabel = author?.username ?? author?.display_name ?? null

  const onShare = useCallback(() => {
    const slug = restaurantBrief?.slug?.trim()
    if (!slug || !restaurantBrief?.title) return
    void shareRestaurantListing({ title: restaurantBrief.title, slug })
  }, [restaurantBrief])

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace(SCREEN_HOME)
  }, [])

  const centered = (text: string) => (
    <View className="flex-1 items-center justify-center px-8" style={{ paddingTop: insets.top + 56 }}>
      <Text className="text-center text-base leading-relaxed" style={{ fontFamily: FONT.body, color: TEXT_MUTED }}>
        {text}
      </Text>
    </View>
  )

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      <Stack.Screen options={{ headerShown: false }} />
      {paramError ? (
        centered(paramError)
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : error ? (
        centered(error)
      ) : review ? (
        <ReviewViewerBody
          review={review}
          author={author}
          restaurantBrief={restaurantBrief}
          initialLiked={initialLiked}
        />
      ) : (
        centered('Something went wrong.')
      )}

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 flex-row items-center justify-between"
        style={{ top: insets.top + 6, paddingHorizontal: 16 }}
      >
        <CircleIconButton icon="chevron-left" accessibilityLabel="Go back" onPress={goBack} />
        {review ? (
          <View className="flex-row" style={{ gap: 8 }}>
            {restaurantBrief?.slug ? <CircleIconButton icon="share" accessibilityLabel="Share" onPress={onShare} /> : null}
            {canModerate(review.author_id) ? (
              <CircleIconButton
                icon="more-horizontal"
                accessibilityLabel="More options"
                onPress={() =>
                  openContentActions({
                    targetType: 'review',
                    targetId: review.id,
                    ownerId: review.author_id,
                    ownerLabel: authorLabel,
                    onBlocked: () => router.back(),
                  })
                }
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}
