import type { JSX } from 'react'
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { BRAND_PRIMARY, BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { parseProfilePalates } from '@/lib/profileFormatting'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { reviewImageUris } from '@/lib/reviewDisplayUtils'
import { formatRelativeTime } from '@/lib/utils'
import type { FollowingFeedReviewRow } from '@/services/followingFeedService'

const THUMB = 80
const PALATE_CAP = 8

/** Public label: displayName → @username → email local part → fallback. */
function headlineAuthorName(review: FollowingFeedReviewRow): string {
  const dn = review.AuthorProfile?.user?.displayName?.trim()
  if (dn) return dn
  const u = review.AuthorProfile?.username?.trim()
  if (u) return u.replace(/^@/, '')
  const email = review.AuthorProfile?.user?.email?.trim()
  if (email && email.includes('@')) return email.split('@')[0] ?? 'Someone'
  return 'Someone'
}

/** Subtitle row: prefer @username when set; otherwise same as headline (no stray @ on full names). */
function authorSubtitleLine(review: FollowingFeedReviewRow, headline: string): string {
  const u = review.AuthorProfile?.username?.trim()
  if (u) return u.startsWith('@') ? u : `@${u.replace(/^@/, '')}`
  return headline
}

function restaurantDisplayName(review: FollowingFeedReviewRow): string {
  const t = review.restaurant?.title?.trim()
  if (t) return stripHtml(t)
  return 'a restaurant'
}

export type FollowingFeedReviewCardProps = {
  review: FollowingFeedReviewRow
  onPressCard: () => void
  onPressAuthor: () => void
}

/**
 * Elevated card: author + time, rating pill, restaurant title, palate chips, excerpt, images.
 */
export function FollowingFeedReviewCard({
  review,
  onPressCard,
  onPressAuthor,
}: FollowingFeedReviewCardProps) {
  const avatarUrl = review.AuthorProfile?.user?.avatarUrl?.trim()
  const author = headlineAuthorName(review)
  const authorLine = authorSubtitleLine(review, author)
  const place = restaurantDisplayName(review)
  const ratingNum =
    review.rating != null &&
    !Number.isNaN(Number(review.rating)) &&
    Number(review.rating) > 0
      ? Number(review.rating)
      : null
  const timeLabel = formatRelativeTime(review.created_at)
  const thumbs = reviewImageUris(review.images, 8)
  const excerpt = stripHtml(review.content ?? '')
    .trim()
    .slice(0, 160)
  const contentFull = review.content ? stripHtml(review.content).trim() : ''
  const palateTags = parseProfilePalates(review.AuthorProfile?.palates).slice(0, PALATE_CAP)

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${authorLine} profile`}
          onPress={onPressAuthor}
          style={styles.authorBlock}
          hitSlop={8}
        >
          {avatarUrl ? (
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color={TEXT_MUTED} />
            </View>
          )}
          <View style={styles.authorTextCol}>
            <Text style={styles.authorLine} numberOfLines={1}>
              {authorLine}
            </Text>
            <Text style={styles.timeLabel}>{timeLabel}</Text>
          </View>
        </Pressable>
        {ratingNum != null ? (
          <View
            style={styles.ratingBadge}
            accessibilityLabel={`Rating ${ratingNum.toFixed(1)} out of 5`}
          >
            <Text style={styles.ratingBadgeText}>{ratingNum.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Review of ${place}`}
        onPress={onPressCard}
        style={({ pressed }) => [styles.bodyPress, pressed && styles.bodyPressActive]}
      >
        <Text style={styles.restaurantTitle} numberOfLines={2}>
          {place}
        </Text>
        <Text style={styles.reviewMeta} numberOfLines={1}>
          {author} reviewed
        </Text>

        {palateTags.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.palateScroll}
            contentContainerStyle={styles.palateScrollContent}
          >
            {palateTags.map((tag, index) => (
              <View
                key={`${tag}-${index}`}
                style={[styles.palateChip, index > 0 ? { marginLeft: 8 } : null]}
              >
                <Text style={styles.palateChipText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {excerpt.length > 0 ? (
          <Text style={styles.excerpt} numberOfLines={3}>
            {excerpt}
            {contentFull.length > 160 ? '…' : ''}
          </Text>
        ) : null}

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
                style={[styles.thumbPress, index > 0 ? { marginLeft: 8 } : null]}
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
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authorBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorTextCol: {
    flex: 1,
    minWidth: 0,
  },
  authorLine: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_HEADING,
  },
  timeLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: BRAND_PRIMARY,
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  bodyPress: {
    marginTop: 12,
  },
  bodyPressActive: {
    opacity: 0.92,
  },
  restaurantTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_HEADING,
    lineHeight: 24,
  },
  reviewMeta: {
    marginTop: 4,
    fontSize: 13,
    color: TEXT_MUTED,
  },
  palateScroll: {
    marginTop: 10,
    maxHeight: 36,
  },
  palateScrollContent: {
    alignItems: 'center',
    paddingRight: 4,
  },
  palateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
  },
  palateChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_HEADING,
  },
  excerpt: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_BODY,
  },
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
})

/** Loading placeholder for vertical following feed. */
export function FollowingFeedRowSkeleton(): JSX.Element {
  return (
    <View style={styles.card} accessibilityElementsHidden>
      <View style={styles.topRow}>
        <View style={styles.authorBlock}>
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: '#e5e7eb' }]} />
          <View style={{ flex: 1 }}>
            <View style={{ height: 14, width: 120, borderRadius: 4, backgroundColor: '#e5e7eb' }} />
            <View
              style={{
                height: 12,
                width: 56,
                borderRadius: 4,
                backgroundColor: '#e5e7eb',
                marginTop: 6,
              }}
            />
          </View>
        </View>
        <View
          style={{
            width: 44,
            height: 28,
            borderRadius: 20,
            backgroundColor: '#e5e7eb',
          }}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <View style={{ height: 22, width: '75%', borderRadius: 4, backgroundColor: '#e5e7eb' }} />
        <View
          style={{
            height: 14,
            width: 100,
            borderRadius: 4,
            backgroundColor: '#e5e7eb',
            marginTop: 8,
          }}
        />
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                height: 28,
                width: 64,
                borderRadius: 20,
                backgroundColor: '#e5e7eb',
                marginLeft: i > 0 ? 8 : 0,
              }}
            />
          ))}
        </View>
        <View
          style={{
            height: 48,
            width: '100%',
            borderRadius: 8,
            backgroundColor: '#f3f4f6',
            marginTop: 8,
          }}
        />
        <View
          style={{
            height: THUMB,
            width: THUMB,
            borderRadius: 12,
            backgroundColor: '#e5e7eb',
            marginTop: 12,
          }}
        />
      </View>
    </View>
  )
}
