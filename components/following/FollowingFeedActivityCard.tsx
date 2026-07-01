import type { JSX, ReactNode } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import {
  FollowingFeedReviewCard,
} from '@/components/following/FollowingFeedReviewCard'
import { BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { formatRelativeTime } from '@/lib/utils'
import type {
  FollowingFeedActivity,
  FollowingFeedAuthorProfile,
  FollowingFeedCheckinRow,
  FollowingFeedCommentRow,
  FollowingFeedReviewActivity,
} from '@/services/followingFeedService'

const COMMENT_EXCERPT_MAX = 160

function resolveUsername(
  profile: FollowingFeedAuthorProfile | null | undefined,
): string {
  return resolveReviewAuthorLabel(profile, 'Someone')
}

function resolveRestaurantName(
  title: string | null | undefined,
): string {
  const t = title?.trim()
  if (t) return stripHtml(t)
  return 'a restaurant'
}

function Avatar({
  profile,
  onPress,
}: {
  profile: FollowingFeedAuthorProfile | null | undefined
  onPress: () => void
}) {
  const avatarUrl = profile?.user?.avatarUrl?.trim()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.avatarWrap}
      hitSlop={6}
    >
      <ProfileAvatarImage size={44} avatarUrl={avatarUrl} style={styles.avatar} />
    </Pressable>
  )
}

function ActivityCardShell({
  profile,
  headline,
  timeLabel,
  onPressAuthor,
  onPressCard,
  children,
}: {
  profile: FollowingFeedAuthorProfile | null | undefined
  headline: JSX.Element
  timeLabel: string
  onPressAuthor: () => void
  onPressCard?: () => void
  children?: ReactNode
}) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Avatar profile={profile} onPress={onPressAuthor} />
        <Pressable
          onPress={onPressAuthor}
          style={styles.headlineWrap}
          accessibilityRole="button"
          hitSlop={4}
        >
          {headline}
          <Text style={styles.timeLabel}>{timeLabel}</Text>
        </Pressable>
      </View>
      {children ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPressCard}
          style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
        >
          {children}
        </Pressable>
      ) : null}
    </View>
  )
}

function CheckinCard({
  item,
  onPressAuthor,
}: {
  item: FollowingFeedCheckinRow
  onPressAuthor: () => void
}) {
  const username = resolveUsername(item.AuthorProfile)
  const restaurant = resolveRestaurantName(item.restaurant?.title)
  const timeLabel = formatRelativeTime(item.checked_in_at)

  return (
    <ActivityCardShell
      profile={item.AuthorProfile}
      timeLabel={timeLabel}
      onPressAuthor={onPressAuthor}
      headline={
        <Text style={styles.headlineLine} numberOfLines={2}>
          <Text style={styles.headlineUsername}>{username}</Text>
          <Text style={styles.headlineVerb}>{' checked in at '}</Text>
          <Text style={styles.headlineRestaurant}>{restaurant}</Text>
        </Text>
      }
    />
  )
}

function CommentCard({
  item,
  onPressAuthor,
  onPressCard,
}: {
  item: FollowingFeedCommentRow
  onPressAuthor: () => void
  onPressCard: () => void
}) {
  const username = resolveUsername(item.AuthorProfile)
  const restaurant = resolveRestaurantName(item.restaurant?.title)
  const timeLabel = formatRelativeTime(item.created_at)
  const excerpt = stripHtml(item.content ?? '').trim().slice(0, COMMENT_EXCERPT_MAX)
  const full = stripHtml(item.content ?? '').trim()

  return (
    <ActivityCardShell
      profile={item.AuthorProfile}
      timeLabel={timeLabel}
      onPressAuthor={onPressAuthor}
      onPressCard={onPressCard}
      headline={
        <Text style={styles.headlineLine} numberOfLines={2}>
          <Text style={styles.headlineUsername}>{username}</Text>
          <Text style={styles.headlineVerb}>{' commented on a review at '}</Text>
          <Text style={styles.headlineRestaurant}>{restaurant}</Text>
        </Text>
      }
    >
      {excerpt.length > 0 ? (
        <Text style={styles.excerpt} numberOfLines={3}>
          {excerpt}
          {full.length > COMMENT_EXCERPT_MAX ? '…' : ''}
        </Text>
      ) : null}
      <Text style={styles.viewReviewLink}>View review</Text>
    </ActivityCardShell>
  )
}

export type FollowingFeedActivityCardProps = {
  activity: FollowingFeedActivity
  onPressReview: (reviewId: string) => void
  onPressComment: (parentReviewId: string) => void
  onPressAuthor: (authorId: string, profile: FollowingFeedAuthorProfile | null | undefined) => void
}

export function FollowingFeedActivityCard({
  activity,
  onPressReview,
  onPressComment,
  onPressAuthor,
}: FollowingFeedActivityCardProps): JSX.Element {
  if (activity.type === 'review') {
    const review = activity as FollowingFeedReviewActivity
    return (
      <FollowingFeedReviewCard
        review={review}
        onPressCard={() => onPressReview(review.id)}
        onPressAuthor={() => onPressAuthor(review.author_id, review.AuthorProfile)}
      />
    )
  }

  if (activity.type === 'checkin') {
    return (
      <CheckinCard
        item={activity}
        onPressAuthor={() => onPressAuthor(activity.user_id, activity.AuthorProfile)}
      />
    )
  }

  return (
    <CommentCard
      item={activity}
      onPressAuthor={() => onPressAuthor(activity.author_id, activity.AuthorProfile)}
      onPressCard={() => onPressComment(activity.parent_review_id)}
    />
  )
}

export { FollowingFeedRowSkeleton } from '@/components/following/FollowingFeedReviewCard'

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
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
  body: {
    marginTop: 14,
  },
  bodyPressed: {
    opacity: 0.88,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 22,
    color: TEXT_BODY,
  },
  viewReviewLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_HEADING,
  },
})
