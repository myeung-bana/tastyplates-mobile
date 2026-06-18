import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { TEXT_MUTED } from '@/constants/brand'
import { parseProfilePalates } from '@/lib/profileFormatting'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import { resolveReviewAuthorAvatarUrl, resolveReviewAuthorLabel } from '@/lib/reviewAuthorDisplay'
import {
  capitalizeWords,
  formatLikeCount,
  formatRelativeTime,
  stripTags,
} from '@/lib/utils'
import type { ReplyRow } from '@/services/reviewService'

const NEUSANS = 'Neusans'
const TEXT_PRIMARY = '#31343F'
const TEXT_BODY = '#494D5D'
const LIKED_COLOR = '#ff7c0a'

function replyAuthorProfile(reply: ReplyRow) {
  return reply.AuthorProfile ?? reply.author ?? null
}

function replyAvatarUrl(reply: ReplyRow): string | null {
  return resolveReviewAuthorAvatarUrl(replyAuthorProfile(reply))
}

function replyPalateLabels(reply: ReplyRow): string[] {
  const profile = replyAuthorProfile(reply)
  return parseProfilePalates(profile?.palates).slice(0, 2)
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
  const avatarUrl = replyAvatarUrl(reply)
  const name = resolveReviewAuthorLabel(profile)
  const body = capitalizeWords(stripTags(reply.content ?? ''))
  const palates = replyPalateLabels(reply)
  const count = likesCount ?? reply.likes_count ?? 0
  const liked = userLiked ?? reply.user_liked ?? false
  const when = formatRelativeTime(reply.created_at)

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
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={openProfile} hitSlop={6} accessibilityRole="button">
          <ProfileAvatarImage size={32} avatarUrl={avatarUrl} style={{ backgroundColor: '#e5e7eb' }} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <Pressable onPress={openProfile} hitSlop={4}>
                  <Text
                    style={{ fontFamily: NEUSANS, fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </Pressable>
                {palates.map((label) => (
                  <View
                    key={`${reply.id}-${label}`}
                    style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontFamily: NEUSANS, fontSize: 11, color: TEXT_BODY }}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontFamily: NEUSANS, fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{when}</Text>
            </View>

            <Pressable
              onPress={handleLike}
              disabled={isLikeLoading}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: isLikeLoading ? 0.6 : 1 }}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Unlike comment' : 'Like comment'}
            >
              <AppIcon
                name="heart"
                active={liked}
                size={16}
                color={liked ? LIKED_COLOR : TEXT_PRIMARY}
              />
              {count > 0 ? (
                <Text style={{ fontFamily: NEUSANS, fontSize: 12, color: TEXT_PRIMARY }}>
                  {formatLikeCount(count)}
                </Text>
              ) : null}
            </Pressable>
          </View>

          {body ? (
            <Text
              style={{
                fontFamily: NEUSANS,
                fontSize: 14,
                color: TEXT_BODY,
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              {body}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}