import { ActivityIndicator, Text, View } from 'react-native'

import { ProfilePublicListRow } from '@/components/profile/ProfilePublicListRow'
import {
  RestaurantListSkeletonRow,
  useSkeletonPulse,
} from '@/components/ui/Skeleton/RestaurantListSkeleton'
import { BRAND_PRIMARY, TEXT_MUTED } from '@/constants/brand'
import type { ProfilePublicListSummary } from '@/services/profileUserListsService'

export interface ProfilePublicListsPreviewProps {
  error: string | null
  loading?: boolean
  lists: ProfilePublicListSummary[]
  emptyMessage?: string
  onPressList: (list: ProfilePublicListSummary) => void
}

export function ProfilePublicListsPreview({
  error,
  loading = false,
  lists,
  emptyMessage = 'Public lists from this account will appear here soon.',
  onPressList,
}: ProfilePublicListsPreviewProps): JSX.Element {
  const skeletonOpacity = useSkeletonPulse()

  if (loading && lists.length === 0) {
    return (
      <View className="gap-0 pt-1">
        {Array.from({ length: 3 }, (_, index) => (
          <RestaurantListSkeletonRow key={`profile-list-skeleton-${index}`} opacity={skeletonOpacity} />
        ))}
      </View>
    )
  }

  if (error) {
    return (
      <Text className="pt-1 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
        {error}
      </Text>
    )
  }

  if (lists.length === 0) {
    return (
      <Text className="pt-1 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
        {emptyMessage}
      </Text>
    )
  }

  return (
    <View className="pt-1">
      {lists.map((list) => (
        <ProfilePublicListRow key={list.uuid} list={list} onPress={() => onPressList(list)} />
      ))}
      {loading ? (
        <View className="items-center py-4">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : null}
    </View>
  )
}
