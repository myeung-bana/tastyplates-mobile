import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useModeration } from '@/contexts/ModerationContext'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import { formatLikeCount, formatRelativeTime, stripTags } from '@/lib/utils'
import type { ReplyRow } from '@/services/reviewService'

function replyAuthorProfile(reply: ReplyRow) {
  return reply.AuthorProfile ?? reply.author ?? null
}

export interface ReplyItemProps {
  reply: ReplyRow
  likesCount?: number
  userLiked?: boolean
  onLike: (reply: ReplyRow) => void
  isLikeLoading?: boolean
  onAuthRequired?: () => void
  isAuthenticated?: boolean
}

/**
 * One comment (design R2 / R3): avatar, "@user text" inline, relative time, like count on the
 * right. Long press opens Report / Block (design X4).
 */
export function ReplyItem({
  reply,
  likesCount,
  userLiked,
  onLike,
  isLikeLoading = false,
  onAuthRequired,
  isAuthenticated = true,
}: ReplyItemProps): JSX.Element {
  const profile = replyAuthorProfile(reply)
  const authorId = profile?.user_id ?? reply.author_id
  const avatarUrl = resolveReviewAuthorAvatarUrl(profile)
  const name = resolveReviewAuthorLabel(profile)
  const body = stripTags(reply.content ?? '').trim()
  const count = likesCount ?? reply.likes_count ?? 0
  const liked = userLiked ?? reply.user_liked ?? false
  const when = formatRelativeTime(reply.created_at).replace(/ ago$/, '')

  const { openContentActions, canModerate } = useModeration()
  const openActions = canModerate(authorId)
    ? () => openContentActions({ targetType: 'comment', targetId: reply.id, ownerId: authorId, ownerLabel: name })
    : undefined

  const openProfile = () => {
    void Haptics.selectionAsync()
    if (!isAuthenticated) {
      onAuthRequired?.()
      return
    }
    pushPublicProfile(router, publicProfileFromAuthorFields(authorId, profile))
  }

  const handleLike = () => {
    if (!isAuthenticated) {
      onAuthRequired?.()
      return
    }
    void Haptics.selectionAsync()
    onLike(reply)
  }

  return (
    <Pressable
      onLongPress={openActions}
      accessibilityHint={openActions ? 'Long press to report or block' : undefined}
      className="flex-row"
      style={{ gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SURFACE_FOG }}
    >
      <Pressable onPress={openProfile} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Open ${name}'s profile`}>
        <ProfileAvatarImage
          size={32}
          avatarUrl={avatarUrl}
          style={{ backgroundColor: SURFACE_FOG, borderWidth: 1, borderColor: BORDER_SUBTLE }}
        />
      </Pressable>

      <View className="min-w-0 flex-1" style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: TEXT_HEADING }}>
          <Text onPress={openProfile} style={{ fontFamily: FONT.bodySemibold }}>
            {name}
          </Text>
          {body ? ` ${body}` : ''}
        </Text>
        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>{when}</Text>
      </View>

      <Pressable
        onPress={handleLike}
        disabled={isLikeLoading}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Unlike comment' : 'Like comment'}
        className="flex-row items-center self-start"
        style={{ gap: 6, height: 44, marginTop: -6, opacity: isLikeLoading ? 0.6 : 1 }}
      >
        <AppIcon name="heart" active={liked} size={18} color={liked ? BRAND_PRIMARY : TEXT_HEADING} />
        <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>{formatLikeCount(count)}</Text>
      </Pressable>
    </Pressable>
  )
}
