import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { parseProfilePalates } from '@/lib/profileFormatting'
import { pushPublicProfile } from '@/lib/publicProfileNavigation'
import type { FollowListUser } from '@/services/followListService'

type Props = {
  user: FollowListUser
  isFollowing: boolean
  followLoading: boolean
  showFollowButton: boolean
  /** Followers tab uses “Follow Back” when not following yet. */
  useFollowBackLabel?: boolean
  onToggleFollow: () => void
  /** The viewer's own row — shows "You" instead of a button. */
  isSelf?: boolean
}

function followButtonLabel(isFollowing: boolean, useFollowBackLabel: boolean): string {
  if (isFollowing) return 'Following'
  return useFollowBackLabel ? 'Follow Back' : 'Follow'
}

export function FollowListUserRow({
  user,
  isFollowing,
  followLoading,
  showFollowButton,
  useFollowBackLabel = false,
  onToggleFollow,
  isSelf = false,
}: Props): JSX.Element {
  const router = useRouter()
  const handle = user.username?.trim().replace(/^@/, '')
  const label =
    user.display_name?.trim() || user.username?.trim()?.replace(/^@/, '') || 'Member'
  const palates = parseProfilePalates(user.palates)

  const openProfile = () => {
    void Haptics.selectionAsync()
    pushPublicProfile(router, {
      authorId: user.id,
      username: handle,
    })
  }

  const actionLabel = followButtonLabel(isFollowing, useFollowBackLabel)

  return (
    <View
      className="flex-row items-center"
      style={{ gap: 12, paddingVertical: 12, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: SURFACE_FOG }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${label} profile`}
        onPress={openProfile}
        className="flex-row items-center active:opacity-80"
        style={{ flex: 1, minWidth: 0, gap: 12 }}
      >
        <ProfileAvatarImage size={48} avatarUrl={user.profile_image} style={{ borderWidth: 1, borderColor: BORDER_SUBTLE }} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: TEXT_HEADING }}>
            {handle ? `@${handle}` : label}
          </Text>
          {handle && label !== handle ? (
            <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>
              {label}
            </Text>
          ) : null}
          {palates.length > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: 4, marginTop: 2 }}>
              {palates.map((palate) => (
                <View
                  key={`${user.id}-${palate}`}
                  style={{ height: 22, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 999, borderWidth: 1.5, borderColor: BORDER_SUBTLE }}
                >
                  <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 11, color: TEXT_HEADING }}>{palate}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>

      {showFollowButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? 'Unfollow' : actionLabel}
          accessibilityState={{ selected: isFollowing, busy: followLoading }}
          disabled={followLoading}
          onPress={() => {
            void Haptics.selectionAsync()
            onToggleFollow()
          }}
          className="items-center justify-center active:opacity-80"
          style={[
            { height: 34, paddingHorizontal: 14, borderRadius: 999 },
            isFollowing
              ? { backgroundColor: SURFACE_FOG }
              : { borderWidth: 1.5, borderColor: BRAND_PRIMARY },
            followLoading ? { opacity: 0.55 } : null,
          ]}
        >
          {followLoading ? (
            <ActivityIndicator color={TEXT_HEADING} size="small" />
          ) : (
            <Text style={{ fontFamily: FONT.heading, fontSize: 13, letterSpacing: 0.5, color: isFollowing ? TEXT_HEADING : BRAND_PRIMARY_DARK }}>
              {actionLabel}
            </Text>
          )}
        </Pressable>
      ) : isSelf ? (
        <Text style={{ fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>You</Text>
      ) : null}
    </View>
  )
}
