import { View } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

import {
  SkeletonBlock,
  useSkeletonPulse,
} from '@/components/ui/Skeleton/RestaurantListSkeleton'

export interface RestaurantBrowseCardSkeletonProps {
  width?: number
  opacity?: SharedValue<number>
}

/** Mirrors {@link RestaurantBrowseCard} — image 16:9, title/rating row, address, category. */
export function RestaurantBrowseCardSkeleton({
  width,
  opacity: sharedOpacity,
}: RestaurantBrowseCardSkeletonProps): JSX.Element {
  const localOpacity = useSkeletonPulse()
  const opacity = sharedOpacity ?? localOpacity

  return (
    <View
      style={{ width: width ?? '100%', paddingBottom: 16 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SkeletonBlock
        opacity={opacity}
        style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16 }}
      />

      <View style={{ paddingTop: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <SkeletonBlock opacity={opacity} style={{ height: 16, borderRadius: 4, flex: 1, maxWidth: '62%' }} />
          <SkeletonBlock opacity={opacity} style={{ height: 14, width: 56, borderRadius: 4, flexShrink: 0 }} />
        </View>
        <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '78%' }} />
        <SkeletonBlock opacity={opacity} style={{ height: 12, borderRadius: 4, width: '48%' }} />
      </View>
    </View>
  )
}

export function RestaurantBrowseSkeletonList({
  count = 6,
  cardWidth,
}: {
  count?: number
  cardWidth?: number
}): JSX.Element {
  const opacity = useSkeletonPulse()

  return (
    <View style={{ marginTop: 12, gap: 12, paddingBottom: 24 }}>
      {Array.from({ length: count }, (_, i) => (
        <RestaurantBrowseCardSkeleton key={i} width={cardWidth} opacity={opacity} />
      ))}
    </View>
  )
}
