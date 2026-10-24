import { Image, Pressable, Text, View } from 'react-native'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useModeration } from '@/contexts/ModerationContext'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { reviewImageUris } from '@/lib/reviewDisplayUtils'
import { formatLikeCount } from '@/lib/utils'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function formatReviewDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE_FORMAT.format(d)
}

type Props = {
  review: TrendingReviewRow
  onPress: () => void
  onPressAuthor: () => void
}

/**
 * One review in a restaurant's review list (design R1): author + date + rating, a three-line
 * excerpt, up to three photo thumbnails, then like and comment counts.
 */
export function RestaurantReviewRow({ review, onPress, onPressAuthor }: Props): JSX.Element {
  const name = resolveReviewAuthorLabel(review.AuthorProfile)
  const avatarUrl = resolveReviewAuthorAvatarUrl(review.AuthorProfile)
  const title = stripHtml(review.title ?? '').trim()
  const body = stripHtml(review.content ?? '').trim()
  const excerpt = body || title
  const photos = reviewImageUris(review.images, 3)
  const rating = review.rating != null && review.rating > 0 ? review.rating.toFixed(1) : null

  const { openContentActions, canModerate } = useModeration()
  const openActions = canModerate(review.author_id)
    ? () =>
        openContentActions({
          targetType: 'review',
          targetId: review.id,
          ownerId: review.author_id,
          ownerLabel: name,
        })
    : undefined

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review by ${name}`}
      accessibilityHint={openActions ? 'Long press to report or block' : undefined}
      onPress={onPress}
      onLongPress={openActions}
      className="active:opacity-90"
      style={{ gap: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Pressable onPress={onPressAuthor} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Open ${name}'s profile`}>
          <ProfileAvatarImage
            size={32}
            avatarUrl={avatarUrl}
            style={{ backgroundColor: SURFACE_FOG, borderWidth: 1, borderColor: BORDER_SUBTLE }}
          />
        </Pressable>
        <View className="min-w-0 flex-1" style={{ gap: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>
            {name}
          </Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_MUTED }}>{formatReviewDate(review.created_at)}</Text>
        </View>
        {rating ? (
          <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 13, color: TEXT_HEADING }}>
            <Text style={{ color: BRAND_PRIMARY }}>★</Text> {rating}
          </Text>
        ) : null}
      </View>

      {excerpt ? (
        <Text numberOfLines={3} style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_HEADING }}>
          {excerpt}
        </Text>
      ) : null}

      {photos.length > 0 ? (
        <View className="flex-row" style={{ gap: 6 }}>
          {photos.map((uri, i) => (
            <Image
              key={`${i}-${uri}`}
              accessibilityIgnoresInvertColors
              source={{ uri }}
              style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: SURFACE_FOG }}
              resizeMode="cover"
            />
          ))}
        </View>
      ) : null}

      <View className="flex-row" style={{ gap: 18 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <AppIcon name="heart" size={16} color={TEXT_MUTED} />
          <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>{formatLikeCount(review.likes_count ?? 0)}</Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <AppIcon name="message-circle" size={16} color={TEXT_MUTED} />
          <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>{formatLikeCount(review.replies_count ?? 0)}</Text>
        </View>
      </View>
    </Pressable>
  )
}

export function RestaurantReviewRowSkeleton(): JSX.Element {
  return (
    <View style={{ gap: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE_FOG }} />
        <View style={{ gap: 6, flex: 1 }}>
          <View style={{ width: '40%', height: 12, borderRadius: 4, backgroundColor: SURFACE_FOG }} />
          <View style={{ width: '25%', height: 10, borderRadius: 4, backgroundColor: SURFACE_FOG }} />
        </View>
      </View>
      <View style={{ height: 12, borderRadius: 4, backgroundColor: SURFACE_FOG }} />
      <View style={{ width: '80%', height: 12, borderRadius: 4, backgroundColor: SURFACE_FOG }} />
      <View className="flex-row" style={{ gap: 6 }}>
        <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: SURFACE_FOG }} />
        <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: SURFACE_FOG }} />
      </View>
    </View>
  )
}
