import type { JSX } from 'react'
import { View } from 'react-native'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'

import { BRAND_PRIMARY } from '@/constants/brand'

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

  // Active tab: orange glyph on a soft orange pill (design H1 floating nav).
  return (
    <Animated.View style={animatedStyle}>
      {/* Tint is absolutely positioned so it doesn't change the tab bar's icon slot size. */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {focused ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 64,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,124,9,0.12)',
            }}
          />
        ) : null}
        <AppIcon name={name} active={focused} size={TAB_ICON_SIZE} color={color} />
      </View>
    </Animated.View>
  )
}

/** The orange + at the far right of the signed-in nav; turns into × while the Studio sheet is open. */
export function StudioPlusIcon(): JSX.Element {
  const { collapseProgress } = useTabBarScroll()
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(collapseProgress.value, [0, 1], [0.82, 1]) },
      { translateY: interpolate(collapseProgress.value, [0, 1], [0, TAB_BAR_ICON_TOP_OFFSET]) },
    ],
  }))
  return (
    <Animated.View
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: BRAND_PRIMARY,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: BRAND_PRIMARY,
          shadowOpacity: 0.5,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      <AppIcon name="plus" size={22} color="#FFFFFF" />
    </Animated.View>
  )
}
