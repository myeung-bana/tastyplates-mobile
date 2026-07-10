import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'
import type { EdgeInsets } from 'react-native-safe-area-context'

import { useTabBarScroll } from '@/contexts/TabBarScrollContext'
import {
  getPillExpandedWidth,
  PILL_BORDER_COLOR,
  PILL_BOTTOM_MARGIN,
  PILL_COMPACT_HEIGHT,
  PILL_COMPACT_WIDTH,
  PILL_EXPANDED_HEIGHT,
  PILL_SURFACE_COLOR,
} from '@/constants/tabBar'

type FloatingTabBarPillProps = {
  children: ReactNode
  insets: Pick<EdgeInsets, 'bottom'>
}

/**
 * Floating long pill tab bar — solid surface, scroll-driven size (icons only).
 * {@link BottomTabBar} fills the animated slot via absolute positioning in `getTabBarStyle`.
 */
export function FloatingTabBarPill({ children, insets }: FloatingTabBarPillProps): JSX.Element | null {
  const { collapseProgress, isTabBarSuppressed } = useTabBarScroll()
  const { width: screenWidth } = useWindowDimensions()
  const expandedWidth = useMemo(() => getPillExpandedWidth(screenWidth), [screenWidth])

  const animatedShellStyle = useAnimatedStyle(() => ({
    width: interpolate(
      collapseProgress.value,
      [0, 1],
      [PILL_COMPACT_WIDTH, expandedWidth],
    ),
    height: interpolate(
      collapseProgress.value,
      [0, 1],
      [PILL_COMPACT_HEIGHT, PILL_EXPANDED_HEIGHT],
    ),
  }))

  if (isTabBarSuppressed) return null

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.pill,
          animatedShellStyle,
          {
            marginBottom: insets.bottom + PILL_BOTTOM_MARGIN,
          },
        ]}
      >
        <View style={styles.surface}>
          <View style={styles.contentSlot}>{children}</View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  pill: {
    borderRadius: 999,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  surface: {
    flex: 1,
    backgroundColor: PILL_SURFACE_COLOR,
    borderWidth: 1,
    borderColor: PILL_BORDER_COLOR,
    borderRadius: 999,
  },
  contentSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
    overflow: 'hidden',
  },
})
