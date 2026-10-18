import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { ImageFallback } from '@/components/brand/ImageFallback'
import { AppIcon } from '@/components/ui/AppIcon'
import { StarRow } from '@/components/ui/StarRow'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { firstReviewImageUri } from '@/lib/reviewDisplayUtils'
import { formatRelativeTime } from '@/lib/utils'
import type { FollowingFeedActivity, FollowingFeedAuthorProfile } from '@/services/followingFeedService'

export type ProfileRecentActivityPreviewProps = {
  loading: boolean
  error: string | null
  activities: FollowingFeedActivity[]
  onPressReview: (reviewId: string) => void
  onPressComment: (reviewId: string) => void
  /** Kept for call-site compatibility; profile rows don't link to another author. */
  onPressAuthor?: (authorId: string, profile: FollowingFeedAuthorProfile | null | undefined) => void
  emptyMessage?: string
}

function Headline({ verb, place }: { verb: string; place: string }): JSX.Element {
  return (
    <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 19, color: TEXT_HEADING }}>
      {verb} <Text style={{ fontFamily: FONT.bodySemibold }}>{place}</Text>
    </Text>
  )
}

function Time({ iso }: { iso: string }): JSX.Element {
  return <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>{formatRelativeTime(iso)}</Text>
}

function Row({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label: string }): JSX.Element {
  const style = { flexDirection: 'row' as const, gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }
  if (!onPress) return <View style={style} accessible accessibilityLabel={label}>{children}</View>
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="active:opacity-80"
      style={style}
    >
      {children}
    </Pressable>
  )
}

/** "Latest" on the profile Me page (design P1/P2): the three most recent items. */
export function ProfileRecentActivityPreview({
  loading,
  error,
  activities,
  onPressReview,
  onPressComment,
  emptyMessage = 'Recent activity will appear here.',
}: ProfileRecentActivityPreviewProps): JSX.Element {
  if (loading && activities.length === 0) {
    return (
      <View className="items-center" style={{ paddingVertical: 24 }}>
        <ActivityIndicator color={BRAND_PRIMARY} />
      </View>
    )
  }

  if (error || activities.length === 0) {
    return (
      <Text style={{ paddingVertical: 14, fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_MUTED }}>
        {error ?? emptyMessage}
      </Text>
    )
  }

  return (
    <View>
      {activities.map((a) => {
        const place = a.restaurant?.title?.trim() || 'a restaurant'
        if (a.type === 'review') {
          const img = firstReviewImageUri(a.images, '')
          const excerpt = stripHtml(a.content ?? a.title ?? '').trim()
          return (
            <Row key={`review:${a.id}`} label={`Reviewed ${place}`} onPress={() => onPressReview(a.id)}>
              {img ? (
                <Image source={{ uri: img }} style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: SURFACE_FOG }} />
              ) : (
                <ImageFallback size={72} style={{ borderRadius: 12 }} />
              )}
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Headline verb="Reviewed" place={place} />
                <StarRow value={a.rating} />
                {excerpt ? (
                  <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_MUTED }}>
                    {excerpt}
                  </Text>
                ) : null}
                <Time iso={a.created_at} />
              </View>
            </Row>
          )
        }
        if (a.type === 'checkin') {
          return (
            <Row key={`checkin:${a.id}`} label={`Checked in at ${place}`}>
              <View
                className="items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: BRAND_PRIMARY }}
              >
                <AppIcon name="map-pin" size={17} color={BRAND_PRIMARY} />
              </View>
              <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
                <Headline verb="Checked in at" place={place} />
                <Time iso={a.checked_in_at} />
              </View>
            </Row>
          )
        }
        const text = stripHtml(a.content ?? '').trim()
        return (
          <Row key={`comment:${a.id}`} label={`Commented on a review at ${place}`} onPress={() => onPressComment(a.parent_review_id)}>
            <View
              className="items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
            >
              <AppIcon name="message-circle" size={17} color={TEXT_HEADING} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Headline verb="Commented on a review at" place={place} />
              {text ? (
                <View style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: SURFACE_FOG }}>
                  <Text numberOfLines={3} style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: TEXT_HEADING }}>
                    “{text}”
                  </Text>
                </View>
              ) : null}
              <Time iso={a.created_at} />
            </View>
          </Row>
        )
      })}
    </View>
  )
}
