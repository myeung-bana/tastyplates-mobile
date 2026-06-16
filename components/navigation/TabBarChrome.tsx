import type { ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { TAB_BAR_BG, TAB_BAR_SCRIM_HEIGHT } from '@/constants/tabBar'

type TabBarChromeProps = {
  children: ReactNode
}

/** Subtle fade above the bar only — transparent → solid white at the tab bar top edge. */
const TOP_SCRIM_STOPS = [
  { offset: '0%', opacity: 0 },
  { offset: '55%', opacity: 0.45 },
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
 * Solid white tab bar with a light top scrim so scroll content fades in above the icons.
 * Bar background (incl. safe-area padding) comes from `getTabBarStyle()`.
 */
export function TabBarChrome({ children }: TabBarChromeProps): JSX.Element {
  return (
    <View style={styles.root}>
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
  },
  topScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -TAB_BAR_SCRIM_HEIGHT,
    height: TAB_BAR_SCRIM_HEIGHT,
    zIndex: 0,
  },
})
