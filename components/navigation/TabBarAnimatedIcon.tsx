import type { JSX } from 'react'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { TAB_BAR_ICON_TOP_OFFSET } from '@/constants/tabBar'
import { useTabBarScroll } from '@/contexts/TabBarScrollContext'

const TAB_ICON_SIZE = 22
const COMPACT_ICON_SCALE = 0.88

type TabBarAnimatedIconProps = {
  name: AppIconName
  focused: boolean
  color: string
}

/** Tab icon that scales with scroll-driven pill collapse. */
export function TabBarAnimatedIcon({ name, focused, color }: TabBarAnimatedIconProps): JSX.Element {
  const { collapseProgress } = useTabBarScroll()

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(collapseProgress.value, [0, 1], [COMPACT_ICON_SCALE, 1]),
      },
      {
        translateY: interpolate(collapseProgress.value, [0, 1], [0, TAB_BAR_ICON_TOP_OFFSET]),
      },
    ],
  }))

  return (
    <Animated.View style={animatedStyle}>
      <AppIcon name={name} active={focused} size={TAB_ICON_SIZE} color={color} />
    </Animated.View>
  )
}
