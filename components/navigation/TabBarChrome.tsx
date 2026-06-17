import type { ReactNode } from 'react'
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { TabBarGlassBackdrop } from '@/components/navigation/TabBarGlassBackdrop'
import {
  TAB_BAR_BG,
  TAB_BAR_SCRIM_HEIGHT,
  TAB_BAR_TINT_OPACITY,
} from '@/constants/tabBar'

type TabBarChromeProps = {
  children: ReactNode
}

/** Fades page content into the glass edge above the bar. */
const TOP_SCRIM_STOPS = [
  { offset: '0%', opacity: 0 },
  { offset: '55%', opacity: 0.4 },
  { offset: '100%', opacity: 1 },
] as const

function TabBarTopScrim(): JSX.Element {
  const { width } = useWindowDimensions()

  return (
    <Svg width={width} height={TAB_BAR_SCRIM_HEIGHT}>
      <Defs>
        <LinearGradient id="tabBarTopScrim" x1="0" y1="0" x2="0" y2="1">
          {TOP_SCRIM_STOPS.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={TAB_BAR_BG}
              stopOpacity={stop.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width={width} height={TAB_BAR_SCRIM_HEIGHT} fill="url(#tabBarTopScrim)" />
    </Svg>
  )
}

/**
 * Liquid glass bottom tab bar chrome.
 *
 * Layer order (bottom → top):
 *   1. Glass backdrop — BlurView + tint, or frosted fallback when native blur is missing
 *   2. Top hairline — glass rim highlight at the upper edge
 *   3. Top scrim (SVG) — content dissolve zone above the bar
 *   4. Tab icons — React Navigation BottomTabBar (transparent bg)
 */
export function TabBarChrome({ children }: TabBarChromeProps): JSX.Element {
  const tintOpacity =
    Platform.OS === 'android'
      ? Math.min(TAB_BAR_TINT_OPACITY + 0.18, 0.72)
      : TAB_BAR_TINT_OPACITY

  return (
    <View style={styles.root}>
      <TabBarGlassBackdrop tintOpacity={tintOpacity} />

      <View style={styles.topHairline} pointerEvents="none" />

      <View style={styles.topScrim} pointerEvents="none">
        <TabBarTopScrim />
      </View>

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 1,
  },
  topScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -TAB_BAR_SCRIM_HEIGHT,
    height: TAB_BAR_SCRIM_HEIGHT,
    zIndex: 0,
    overflow: 'hidden',
  },
})
