import type { ImageSourcePropType } from 'react-native'

import {
  normalizeLegacyProfileAvatar,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'

export const DEFAULT_USER_PROFILE_IMAGE = require('@/assets/images/default-user-profile.jpg')

/** Remote avatar URL when valid, otherwise the bundled default profile image. */
export function resolveProfileAvatarSource(
  avatarUrl?: string | null,
  profileImage?: RestaurantUserRow['profile_image'],
): ImageSourcePropType {
  const remote = normalizeLegacyProfileAvatar(avatarUrl, profileImage)
  return remote ? { uri: remote } : DEFAULT_USER_PROFILE_IMAGE
}
