import { Image, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import { TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PUBLIC_PROFILE } from '@/constants/screens'
import { parseProfilePalates } from '@/lib/profileFormatting'
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

function replyAuthorName(reply: ReplyRow): string {
  const profile = replyAuthorProfile(reply)
  const username = profile?.username?.trim()
  if (username) return username.startsWith('@') ? username : `@${username}`
  const display = profile?.user?.displayName?.trim()
  if (display) return display
  const email = profile?.user?.email?.trim()
  if (email?.includes('@')) return email.split('@')[0] ?? 'Member'
  return 'Member'
}

function replyAvatarUrl(reply: ReplyRow): string | null {
  const url = replyAuthorProfile(reply)?.user?.avatarUrl?.trim()
  return url || null
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
  const username = profile?.username?.trim().replace(/^@/, '')
  const avatarUrl = replyAvatarUrl(reply)
  const name = replyAuthorName(reply)
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
    const target = username || authorId
    if (!target) return
    router.push({
      pathname: SCREEN_PUBLIC_PROFILE,
      params: { userId: target.replace(/^@/, '') },
    })
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
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb' }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon name="user" size={16} color={TEXT_MUTED} />
            </View>
          )}
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