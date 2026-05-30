import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY, BORDER_SUBTLE, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useFollowTarget } from '@/hooks/useFollowTarget'
import {
  normalizeLegacyProfileAvatar,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'

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
  const follow = useFollowTarget(user.id, viewerId, false)
  const avatarUri = normalizeLegacyProfileAvatar(user.avatarUrl, user.profile_image)
  const rawName = user.display_name?.trim() || user.username?.trim() || 'Member'
  const label = rawName

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
      {avatarUri ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: avatarUri }}
          className="rounded-full bg-gray-100"
          style={{ width: 72, height: 72 }}
        />
      ) : (
        <View
          className="items-center justify-center rounded-full bg-gray-100"
          style={{ width: 72, height: 72 }}
        >
          <AppIcon name="user" size={32} color={TEXT_MUTED} />
        </View>
      )}
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
