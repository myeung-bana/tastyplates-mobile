import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native'

import { ListCover } from '@/components/studio/manage-lists/ListCover'
import { FONT } from '@/constants/typography'
import {
  RestaurantListSkeletonRow,
  useSkeletonPulse,
} from '@/components/ui/Skeleton/RestaurantListSkeleton'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'

const GRID_GAP = 12
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
  const { width } = useWindowDimensions()
  const tile = Math.floor((width - 40 - GRID_GAP) / 2)

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
      <Text className="pt-1 text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
        {error}
      </Text>
    )
  }

  if (lists.length === 0) {
    return (
      <Text className="pt-1 text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED, paddingTop: 40 }}>
        {emptyMessage}
      </Text>
    )
  }

  // Two-column cover grid with generated covers (design P2 Lists).
  return (
    <View className="flex-row flex-wrap" style={{ paddingTop: 4, columnGap: GRID_GAP, rowGap: 20 }}>
      {lists.map((list) => {
        const count = list.items_count ?? 0
        return (
          <Pressable
            key={list.uuid}
            accessibilityRole="button"
            accessibilityLabel={`${list.title}, ${count} places`}
            onPress={() => onPressList(list)}
            className="active:opacity-90"
            style={{ width: tile, gap: 8 }}
          >
            <ListCover title={list.title} count={count} imageUrl={list.display_pic} seed={list.uuid} size={tile} />
            <View style={{ gap: 4 }}>
              <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 15, color: TEXT_HEADING }}>
                {list.title}
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_TERTIARY }}>
                {count} {count === 1 ? 'place' : 'places'}
              </Text>
            </View>
          </Pressable>
        )
      })}
      {loading ? (
        <View className="items-center py-4">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : null}
    </View>
  )
}
