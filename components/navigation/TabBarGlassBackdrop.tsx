import { StyleSheet, View, Platform } from 'react-native'

import {
  TAB_BAR_BLUR_INTENSITY,
  TAB_BAR_FALLBACK_OPACITY,
} from '@/constants/tabBar'
import { isExpoBlurAvailable } from '@/lib/isExpoBlurAvailable'

type Props = {
  tintOpacity: number
}

/**
 * Frosted glass backdrop for the tab bar.
 * Uses native blur when available; otherwise a translucent white fill (no red-box error).
 */
export function TabBarGlassBackdrop({ tintOpacity }: Props): JSX.Element {
  if (isExpoBlurAvailable()) {
    const { BlurView } = require('expo-blur') as typeof import('expo-blur')

    return (
      <>
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={TAB_BAR_BLUR_INTENSITY}
          tint="systemChromeMaterial"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(255, 255, 255, ${tintOpacity})` },
          ]}
          pointerEvents="none"
        />
      </>
    )
  }

  const fallbackOpacity = Math.min(tintOpacity + TAB_BAR_FALLBACK_OPACITY, 0.94)

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: `rgba(255, 255, 255, ${fallbackOpacity})` },
      ]}
      pointerEvents="none"
    />
  )
}
