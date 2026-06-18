import { Image, type ImageStyle, type StyleProp } from 'react-native'

import { resolveProfileAvatarSource } from '@/lib/profileAvatar'
import type { RestaurantUserRow } from '@/services/restaurantUserService'

export type ProfileAvatarImageProps = {
  size: number
  avatarUrl?: string | null
  profileImage?: RestaurantUserRow['profile_image']
  className?: string
  style?: StyleProp<ImageStyle>
}

/** User avatar — remote URL when present, else `default-user-profile.jpg`. */
export function ProfileAvatarImage({
  size,
  avatarUrl,
  profileImage,
  className,
  style,
}: ProfileAvatarImageProps): JSX.Element {
  return (
    <Image
      accessibilityIgnoresInvertColors
      source={resolveProfileAvatarSource(avatarUrl, profileImage)}
      className={className}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      resizeMode="cover"
    />
  )
}
