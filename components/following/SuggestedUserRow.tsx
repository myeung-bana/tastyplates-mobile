import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'

import { ProfileAvatarImage } from '@/components/profile/ProfileAvatarImage'
import { BRAND_PRIMARY, BORDER_SUBTLE, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useFollowTarget } from '@/hooks/useFollowTarget'
import { pushPublicProfile } from '@/lib/publicProfileNavigation'
import type { RestaurantUserRow } from '@/services/restaurantUserService'

type SuggestedUserRowProps = {
  user: RestaurantUserRow
  viewerId: string
  /** Called after a successful new follow (not when unfollowing). */
  onFollowed: () => void
}

/**
 * Compact card for horizontal “suggested” lists — avatar, name, Follow / Following.
 */
export function SuggestedUserRow({ user, viewerId, onFollowed }: SuggestedUserRowProps) {
  const router = useRouter()
  const follow = useFollowTarget(user.id, viewerId, false)
  const handle = user.username?.trim().replace(/^@/, '')
  const label = handle ? `@${handle}` : 'Member'

  const openProfile = () => {
    void Haptics.selectionAsync()
    pushPublicProfile(router, {
      authorId: user.id,
      username: handle,
    })
  }

  const handlePress = () => {
    void (async () => {
      const wasFollowing = follow.following
      await follow.toggleFollowing()
      if (!wasFollowing) onFollowed()
    })()
  }

  return (
    <View
      className="items-center rounded-2xl border bg-white px-3 pb-3 pt-4"
      style={{ width: 132, borderColor: BORDER_SUBTLE }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${label}'s profile`}
        onPress={openProfile}
        className="active:opacity-90"
      >
        <ProfileAvatarImage
          size={72}
          avatarUrl={user.avatarUrl}
          profileImage={user.profile_image}
          className="bg-gray-100"
        />
      </Pressable>
      <Text
        className="mt-2 w-full text-center text-xs font-medium"
        style={{ color: TEXT_HEADING }}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={follow.following ? 'Unfollow' : 'Follow'}
        disabled={follow.loading}
        onPress={handlePress}
        className="mt-3 w-full items-center rounded-full py-2 active:opacity-90"
        style={{
          backgroundColor: follow.following ? '#f3f4f6' : BRAND_PRIMARY,
          borderWidth: follow.following ? 1 : 0,
          borderColor: BORDER_SUBTLE,
        }}
      >
        {follow.loading ? (
          <ActivityIndicator color={follow.following ? TEXT_MUTED : '#ffffff'} size="small" />
        ) : (
          <Text
            className="text-xs font-semibold"
            style={{ color: follow.following ? TEXT_HEADING : '#ffffff' }}
          >
            {follow.following ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    </View>
  )
}
