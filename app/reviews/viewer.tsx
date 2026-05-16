import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  RATING_STAR,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import {
  SCREEN_HASHTAG_FEED,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_PUBLIC_PROFILE,
} from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { parseProfilePalates } from '@/lib/profileFormatting'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { firstReviewImageUri, reviewHashtagLabels } from '@/lib/reviewDisplayUtils'
import { formatRelativeTime } from '@/lib/utils'
import { pushLoginScreen } from '@/lib/authRoutes'
import {
  fetchRestaurantBriefByUuid,
  fetchReviewById,
  type ReviewDetailRow,
} from '@/services/reviewDetailService'
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

function capitalizeWords(s: string): string {
  if (!s.trim()) return ''
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function authorDisplayName(author: RestaurantUserRow): string {
  const u = author.username?.trim()
  if (u) return u.startsWith('@') ? u : `@${u}`
  const dn = author.display_name?.trim()
  if (dn) return dn
  const email = author.email?.trim()
  if (email?.includes('@')) return email.split('@')[0] ?? 'Member'
  return 'Member'
}

/** Open author profile — same slug vs UUID rules as `HomeReviewsSection`. */
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

export default function ReviewViewerScreen() {
  const rawId = useLocalSearchParams<{ reviewId?: string | string[] }>().reviewId
  const { reviewId, paramError } = useMemo(() => {
    const r = rawId === undefined ? undefined : Array.isArray(rawId) ? rawId[0] : rawId
    const s = typeof r === 'string' ? r.trim() : ''
    if (!s) return { reviewId: null as string | null, paramError: 'Missing review' as string | null }
    if (!UUID_RE.test(s)) return { reviewId: null, paramError: 'Invalid review link' }
    return { reviewId: s, paramError: null }
  }, [rawId])
  const { isAuthenticated } = useAuth()

  const [review, setReview] = useState<ReviewDetailRow | null>(null)
  const [restaurantBrief, setRestaurantBrief] = useState<{
    title: string | null
    slug: string | null
  } | null>(null)
  const [author, setAuthor] = useState<RestaurantUserRow | null>(null)
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

        const [brief, userResult] = await Promise.all([
          fetchRestaurantBriefByUuid(r.restaurant_uuid),
          fetchRestaurantUserById(r.author_id).catch(() => null),
        ])
        if (cancelled) return
        setRestaurantBrief(brief)
        setAuthor(userResult)
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
  }, [reviewId])

  const coverUri = review ? firstReviewImageUri(review.images, DEFAULT_COVER) : DEFAULT_COVER
  const title = review ? capitalizeWords(stripHtml(review.title ?? '').trim()) : ''
  const body = review ? capitalizeWords(stripHtml(review.content ?? '').trim()) : ''
  const hashtags = review ? reviewHashtagLabels(review.hashtags, 12) : []
  const palates = review ? parseProfilePalates(review.palates) : []
  const ratingLabel =
    review?.rating != null &&
    !Number.isNaN(review.rating) &&
    (review.rating as number) > 0
      ? Number(review.rating).toFixed(1)
      : null
  const when = formatRelativeTime(review?.published_at ?? review?.created_at ?? new Date())

  const authorAvatarUrl = author
    ? normalizeLegacyProfileAvatar(author.avatarUrl ?? null, author.profile_image)
    : null
  const metaBits: string[] = []
  if (review?.likes_count != null && review.likes_count > 0) {
    metaBits.push(`${review.likes_count} like${review.likes_count === 1 ? '' : 's'}`)
  }
  if (review?.replies_count != null && review.replies_count > 0) {
    metaBits.push(`${review.replies_count} repl${review.replies_count === 1 ? 'y' : 'ies'}`)
  }
  metaBits.push(when)

  const statusLabel =
    review?.status && review.status !== 'approved' ? review.status.replace(/_/g, ' ') : null

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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="aspect-[16/11] w-full overflow-hidden bg-gray-100">
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: coverUri }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>

          <View className="border-b px-5 py-5" style={{ borderBottomColor: BORDER_SUBTLE }}>
            <View className="mb-3 flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open reviewer profile"
                hitSlop={6}
                onPress={() => {
                  if (!author) return
                  if (!isAuthenticated) {
                    pushLoginScreen(router, { resume: '/(tabs)' })
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
                    <Ionicons name="person" size={22} color={TEXT_MUTED} />
                  </View>
                )}
              </Pressable>

              <View className="min-w-0 flex-1">
                <Pressable
                  onPress={() => {
                    if (!author) return
                    if (!isAuthenticated) {
                      pushLoginScreen(router, { resume: '/(tabs)' })
                      return
                    }
                    openAuthorProfile(author, review.author_id)
                  }}
                  disabled={!author}
                  className="active:opacity-80"
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: TEXT_HEADING }}
                    numberOfLines={1}
                  >
                    {author ? authorDisplayName(author) : 'Member'}
                  </Text>
                  <Text className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }} numberOfLines={1}>
                    {metaBits.join(' · ')}
                  </Text>
                </Pressable>
              </View>

              {ratingLabel ? (
                <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
                  <Text style={{ color: RATING_STAR }} className="text-base">
                    ★
                  </Text>
                  <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
                    {ratingLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {restaurantBrief?.title ? (
              <Pressable
                accessibilityRole={
                  restaurantBrief.slug ? 'button' : 'none'
                }
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
                <Ionicons name="restaurant-outline" size={18} color={TEXT_MUTED} />
                <Text
                  className="text-[15px] font-medium underline"
                  style={{ color: TEXT_MUTED }}
                  numberOfLines={2}
                >
                  {restaurantBrief.title}
                </Text>
                {restaurantBrief.slug ? (
                  <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
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
              <Text
                className="mb-2 text-xl font-semibold leading-snug"
                style={{ color: TEXT_HEADING }}
              >
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

            {palates.length > 0 ? (
              <View className="mt-4 border-t pt-4" style={{ borderTopColor: BORDER_SUBTLE }}>
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
                  Palates
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {palates.map((p) => (
                    <View
                      key={p}
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: '#f3f4f6' }}
                    >
                      <Text className="text-sm" style={{ color: TEXT_BODY }}>
                        {p}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
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
