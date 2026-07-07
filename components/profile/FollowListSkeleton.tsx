import { View } from 'react-native'

import {
  SkeletonBlock,
  useSkeletonPulse,
} from '@/components/ui/Skeleton/RestaurantListSkeleton'

function FollowListSkeletonRow({
  opacity,
}: {
  opacity: ReturnType<typeof useSkeletonPulse>
}): JSX.Element {
  return (
    <View
      className="flex-row items-start gap-3 px-5 py-3"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SkeletonBlock opacity={opacity} style={{ width: 44, height: 44, borderRadius: 22 }} />
      <View className="min-w-0 flex-1 gap-2 pt-1">
        <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, width: '55%' }} />
        <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '40%' }} />
      </View>
      <SkeletonBlock opacity={opacity} style={{ width: 72, height: 32, borderRadius: 16, marginTop: 4 }} />
    </View>
  )
}

export function FollowListSkeletonList({ count = 6 }: { count?: number }): JSX.Element {
  const opacity = useSkeletonPulse()

  return (
    <View className="pt-2">
      {Array.from({ length: count }, (_, index) => (
        <FollowListSkeletonRow key={`follow-list-skeleton-${index}`} opacity={opacity} />
      ))}
    </View>
  )
}
