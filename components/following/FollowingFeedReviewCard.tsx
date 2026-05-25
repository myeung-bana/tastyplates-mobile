import type { JSX } from 'react'
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { BORDER_SUBTLE, RATING_STAR, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { coerceRatingNumber } from '@/lib/ratingDisplayUtils'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { reviewImageUris } from '@/lib/reviewDisplayUtils'
import { formatLikeCount, formatRelativeTime } from '@/lib/utils'
import type { FollowingFeedReviewRow } from '@/services/followingFeedService'

const THUMB = 84
const MAX_STARS = 5

// ─── helpers ──────────────────────────────────────────────────────────────────

/** displayName → @username → email local → fallback */
function resolveUsername(review: FollowingFeedReviewRow): string {
  const u = review.AuthorProfile?.username?.trim()
  if (u) return u.startsWith('@') ? u : `@${u}`
  const dn = review.AuthorProfile?.user?.displayName?.trim()
  if (dn) return dn
  const email = review.AuthorProfile?.user?.email?.trim()
  if (email?.includes('@')) return `@${email.split('@')[0]}`
  return 'Someone'
}

function resolveRestaurantName(review: FollowingFeedReviewRow): string {
  const t = review.restaurant?.title?.trim()
  if (t) return stripHtml(t)
  return 'a restaurant'
}

/** Map a rating 0–5 to a background colour for the badge. */
function ratingBadgeColor(rating: number): string {
  if (rating >= 4.5) return '#16a34a' // green-600
  if (rating >= 4.0) return '#0d9488' // teal-600
  if (rating >= 3.0) return '#d97706' // amber-600
  return '#dc2626' // red-600
}

// ─── sub-components ───────────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: number | null | undefined }) {
  const n = coerceRatingNumber(rating)
  if (!n) return null
  return (
    <View style={[styles.ratingBadge, { backgroundColor: ratingBadgeColor(n) }]}>
      <Text style={styles.ratingBadgeText}>{n.toFixed(1)}</Text>
    </View>
  )
}

function StarRow({ rating }: { rating: number | null | undefined }) {
  const n = coerceRatingNumber(rating)
  if (!n) return null
  const full = Math.floor(n)
  const half = n - full >= 0.5
  const empty = MAX_STARS - full - (half ? 1 : 0)
  return (
    <View style={styles.starRow}>
      {Array.from({ length: full }, (_, i) => (
        <Ionicons key={`f${i}`} name="star" size={13} color={RATING_STAR} />
      ))}
      {half && <Ionicons name="star-half" size={13} color={RATING_STAR} />}
      {Array.from({ length: empty }, (_, i) => (
        <Ionicons key={`e${i}`} name="star-outline" size={13} color={RATING_STAR} />
      ))}
      <Text style={styles.starScore}>{n.toFixed(1)}</Text>
    </View>
  )
}

// ─── main card ────────────────────────────────────────────────────────────────

export type FollowingFeedReviewCardProps = {
  review: FollowingFeedReviewRow
  onPressCard: () => void
  onPressAuthor: () => void
}

export function FollowingFeedReviewCard({
  review,
  onPressCard,
  onPressAuthor,
}: FollowingFeedReviewCardProps) {
  const avatarUrl = review.AuthorProfile?.user?.avatarUrl?.trim()
  const username = resolveUsername(review)
  const restaurant = resolveRestaurantName(review)
  const timeLabel = formatRelativeTime(review.created_at)
  const thumbs = reviewImageUris(review.images, 8)
  const excerpt = stripHtml(review.content ?? '').trim().slice(0, 200)
  const contentFull = review.content ? stripHtml(review.content).trim() : ''
  const likesCount = review.likes_count ?? 0
  const repliesCount = review.replies_count ?? 0

  return (
    <View style={styles.card}>

      {/* ── top row: avatar · headline · badge ── */}
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${username} profile`}
          onPress={onPressAuthor}
          style={styles.avatarWrap}
          hitSlop={6}
        >
          {avatarUrl ? (
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={20} color={TEXT_MUTED} />
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={onPressAuthor}
          style={styles.headlineWrap}
          accessibilityRole="button"
          hitSlop={4}
        >
          {/* "{Username} has reviewed {Restaurant Name}" */}
          <Text style={styles.headlineLine} numberOfLines={2}>
            <Text style={styles.headlineUsername}>{username}</Text>
            <Text style={styles.headlineVerb}>{' has reviewed '}</Text>
            <Text style={styles.headlineRestaurant}>{restaurant}</Text>
          </Text>
          <Text style={styles.timeLabel}>{timeLabel}</Text>
        </Pressable>

        <RatingBadge rating={review.rating} />
      </View>

      {/* ── body ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read review of ${restaurant}`}
        onPress={onPressCard}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
      >
        {/* review excerpt */}
        {excerpt.length > 0 ? (
          <Text style={styles.excerpt} numberOfLines={4}>
            {excerpt}
            {contentFull.length > 200 ? '…' : ''}
          </Text>
        ) : null}

        {/* image thumbnails */}
        {thumbs.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbScroll}
            contentContainerStyle={styles.thumbScrollContent}
          >
            {thumbs.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                onPress={onPressCard}
                style={[styles.thumbPress, index > 0 && { marginLeft: 8 }]}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  source={{ uri }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </Pressable>

      {/* ── action row: like · comment ── */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={onPressCard}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`${likesCount} likes`}
        >
          <Ionicons name="heart-outline" size={17} color={TEXT_MUTED} />
          <Text style={styles.actionCount}>{formatLikeCount(likesCount)}</Text>
        </Pressable>
        <Pressable
          onPress={onPressCard}
          style={[styles.actionBtn, { marginLeft: 16 }]}
          accessibilityRole="button"
          accessibilityLabel={`${repliesCount} comments`}
        >
          <Ionicons name="chatbubble-outline" size={16} color={TEXT_MUTED} />
          <Text style={styles.actionCount}>{formatLikeCount(repliesCount)}</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

export function FollowingFeedRowSkeleton(): JSX.Element {
  return (
    <View style={styles.card} accessibilityElementsHidden>
      {/* top row */}
      <View style={styles.topRow}>
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: '#e5e7eb' }]} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ height: 14, width: '80%', borderRadius: 4, backgroundColor: '#e5e7eb' }} />
          <View style={{ height: 12, width: 56, borderRadius: 4, backgroundColor: '#e5e7eb', marginTop: 6 }} />
        </View>
        <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: '#e5e7eb' }} />
      </View>
      {/* stars placeholder */}
      <View style={{ flexDirection: 'row', marginTop: 14, gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ width: 13, height: 13, borderRadius: 3, backgroundColor: '#e5e7eb' }} />
        ))}
      </View>
      {/* excerpt placeholder */}
      <View style={{ marginTop: 10 }}>
        <View style={{ height: 13, width: '100%', borderRadius: 4, backgroundColor: '#f3f4f6' }} />
        <View style={{ height: 13, width: '85%', borderRadius: 4, backgroundColor: '#f3f4f6', marginTop: 6 }} />
        <View style={{ height: 13, width: '60%', borderRadius: 4, backgroundColor: '#f3f4f6', marginTop: 6 }} />
      </View>
      {/* image placeholder */}
      <View style={{ height: THUMB, width: THUMB, borderRadius: 12, backgroundColor: '#e5e7eb', marginTop: 14 }} />
      {/* action row */}
      <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
        <View style={{ height: 16, width: 44, borderRadius: 4, backgroundColor: '#e5e7eb' }} />
        <View style={{ height: 16, width: 44, borderRadius: 4, backgroundColor: '#e5e7eb' }} />
      </View>
    </View>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },

  // ── top row ──
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    marginRight: 10,
    marginTop: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  headlineLine: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  headlineUsername: {
    fontWeight: '700',
    color: TEXT_HEADING,
  },
  headlineVerb: {
    fontWeight: '400',
    color: TEXT_MUTED,
  },
  headlineRestaurant: {
    fontWeight: '700',
    color: TEXT_HEADING,
  },
  timeLabel: {
    marginTop: 3,
    fontSize: 12,
    color: TEXT_MUTED,
  },

  // ── rating badge ──
  ratingBadge: {
    marginTop: 2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  // ── body ──
  body: {
    marginTop: 14,
  },
  bodyPressed: {
    opacity: 0.88,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starScore: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_HEADING,
  },
  excerpt: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: TEXT_BODY,
  },

  // ── thumbnails ──
  thumbScroll: {
    marginTop: 12,
  },
  thumbScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  thumbPress: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },

  // ── actions ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
})
