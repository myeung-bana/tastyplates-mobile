import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PUBLIC_PROFILE } from '@/constants/screens'
import { parseProfilePalates } from '@/lib/profileFormatting'
import type { FollowListUser } from '@/services/followListService'
import { normalizeLegacyProfileAvatar } from '@/services/restaurantUserService'

type Props = {
  user: FollowListUser
  isFollowing: boolean
  followLoading: boolean
  showFollowButton: boolean
  /** Followers tab uses “Follow Back” when not following yet. */
  useFollowBackLabel?: boolean
  onToggleFollow: () => void
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
}: Props): JSX.Element {
  const router = useRouter()
  const avatarUri = normalizeLegacyProfileAvatar(user.profile_image, null)
  const handle = user.username?.trim().replace(/^@/, '')
  const label =
    user.display_name?.trim() || user.username?.trim()?.replace(/^@/, '') || 'Member'
  const palates = parseProfilePalates(user.palates)

  const openProfile = () => {
    void Haptics.selectionAsync()
    const key = handle || user.id
    router.push({
      pathname: SCREEN_PUBLIC_PROFILE,
      params: { userId: key },
    })
  }

  const actionLabel = followButtonLabel(isFollowing, useFollowBackLabel)

  return (
    <View className="flex-row items-start gap-3 px-5 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${label} profile`}
        onPress={openProfile}
        className="mt-0.5"
      >
        {avatarUri ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: avatarUri }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6' }}
          />
        ) : (
          <View
            className="items-center justify-center rounded-full bg-gray-100"
            style={{ width: 44, height: 44 }}
          >
            <Text className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>
              {label.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        className="min-w-0 flex-1"
        onPress={openProfile}
      >
        <Text className="text-base font-medium" style={{ color: TEXT_HEADING }} numberOfLines={1}>
          {handle ? `@${handle}` : label}
        </Text>
        {handle && label !== handle ? (
          <Text className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        {palates.length > 0 ? (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {palates.map((palate) => (
              <View key={`${user.id}-${palate}`} className="rounded-full bg-[#f1f1f1] px-2 py-0.5">
                <Text className="text-xs font-medium text-[#31343f]">{palate}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Pressable>

      {showFollowButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? 'Unfollow' : actionLabel}
          disabled={followLoading}
          onPress={() => {
            void Haptics.selectionAsync()
            onToggleFollow()
          }}
          className="mt-1 items-center justify-center rounded-full border px-3 py-2 active:opacity-90"
          style={[
            isFollowing
              ? { borderColor: '#000000', backgroundColor: '#ffffff' }
              : { borderColor: BRAND_PRIMARY, backgroundColor: BRAND_PRIMARY },
            followLoading ? { opacity: 0.55 } : null,
          ]}
        >
          {followLoading ? (
            <ActivityIndicator color={isFollowing ? TEXT_HEADING : '#ffffff'} size="small" />
          ) : (
            <Text
              className={`text-xs ${isFollowing ? 'font-medium' : 'font-semibold'}`}
              style={{ color: isFollowing ? TEXT_HEADING : '#ffffff' }}
            >
              {actionLabel}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  )
}
