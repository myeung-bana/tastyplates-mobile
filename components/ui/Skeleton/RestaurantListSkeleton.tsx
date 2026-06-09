import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { FlashList } from '@shopify/flash-list'

const SKELETON_DATA = Array.from({ length: 8 }, (_, i) => i)

export function useSkeletonPulse() {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
    )
  }, [opacity])

  return opacity
}

export function SkeletonBlock({
  opacity,
  style,
}: {
  opacity: ReturnType<typeof useSharedValue<number>>
  style: object
}): JSX.Element {
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[{ backgroundColor: '#e5e7eb' }, style, animStyle]} />
}

export function RestaurantListSkeletonRow({
  opacity,
}: {
  opacity: ReturnType<typeof useSharedValue<number>>
}): JSX.Element {
  return (
    <View
      style={{ height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Thumbnail */}
      <SkeletonBlock opacity={opacity} style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0 }} />

      {/* Text bars */}
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock opacity={opacity} style={{ height: 14, borderRadius: 4, width: '65%' }} />
        <SkeletonBlock opacity={opacity} style={{ height: 11, borderRadius: 4, width: '50%', backgroundColor: '#d1d5db' }} />
        <SkeletonBlock opacity={opacity} style={{ height: 11, borderRadius: 4, width: '35%' }} />
      </View>

      {/* Rating stub */}
      <SkeletonBlock opacity={opacity} style={{ height: 11, width: 24, borderRadius: 4, flexShrink: 0 }} />
    </View>
  )
}

export function RestaurantListSkeletonList({ count = 8 }: { count?: number } = {}): JSX.Element {
  const opacity = useSkeletonPulse()
  const data = Array.from({ length: count }, (_, i) => i)

  return (
    <FlashList
      data={data}
      keyExtractor={(item) => String(item)}
      renderItem={() => <RestaurantListSkeletonRow opacity={opacity} />}
      scrollEnabled={false}
    />
  )
}
