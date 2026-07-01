import type { JSX } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import { RatingDisplay } from '@/components/ui/RatingDisplay'

import { BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { reviewImageUris } from '@/lib/reviewDisplayUtils'
import { formatLikeCount, formatRelativeTime } from '@/lib/utils'
import type { FollowingFeedReviewRow } from '@/services/followingFeedService'

const THUMB = 84

function resolveUsername(review: FollowingFeedReviewRow): string {
  return resolveReviewAuthorLabel(review.AuthorProfile, 'Someone')
}

function resolveRestaurantName(review: FollowingFeedReviewRow): string {
  const t = review.restaurant?.title?.trim()
  if (t) return stripHtml(t)
  return 'a restaurant'
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
  const avatarUrl = resolveReviewAuthorAvatarUrl(review.AuthorProfile)
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
          <ProfileAvatarImage size={44} avatarUrl={avatarUrl} style={styles.avatar} />
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

        <RatingDisplay value={review.rating} size="sm" style={styles.ratingSlot} />
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
          <AppIcon name="heart" size={17} color={TEXT_MUTED} />
          <Text style={styles.actionCount}>{formatLikeCount(likesCount)}</Text>
        </Pressable>
        <Pressable
          onPress={onPressCard}
          style={[styles.actionBtn, { marginLeft: 16 }]}
          accessibilityRole="button"
          accessibilityLabel={`${repliesCount} comments`}
        >
          <AppIcon name="message-circle" size={16} color={TEXT_MUTED} />
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
        <View style={{ width: 44, height: 16, borderRadius: 4, backgroundColor: '#e5e7eb' }} />
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

  ratingSlot: {
    marginTop: 2,
    flexShrink: 0,
  },

  // ── body ──
  body: {
    marginTop: 14,
  },
  bodyPressed: {
    opacity: 0.88,
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
