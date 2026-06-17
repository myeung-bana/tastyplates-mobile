import { Platform } from 'react-native'
import type { ViewStyle } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'

/**
 * Tab bar background token.
 * Used by TabBarChrome tint overlay and the SVG scrim colour.
 * Kept as near-white so the scrim gradient still reads cleanly on light pages.
 */
export const TAB_BAR_BG = '#ffffff'

/**
 * Opacity of the white tint overlay rendered above the BlurView.
 * Controls how "milky" vs "glassy" the bar feels:
 *   0.0 = pure frosted glass (shows full colour bleed)
 *   0.5 = milky white (close to original)
 * 0.30 – 0.38 is the Taobao / iOS 18 sweet spot.
 */
export const TAB_BAR_TINT_OPACITY = 0.32

/**
 * expo-blur intensity (0–100).
 * Higher = stronger blur / less legible content behind.
 * 60–70 matches iOS system chrome material.
 */
export const TAB_BAR_BLUR_INTENSITY = 65

/**
 * Extra white opacity layered on the tint when native blur is unavailable
 * (stale dev build, Expo Go mismatch). Keeps icons legible without BlurView.
 */
export const TAB_BAR_FALLBACK_OPACITY = 0.48

/** Fade zone above the tab bar — content dissolves before hitting the glass edge. */
export const TAB_BAR_SCRIM_HEIGHT = 32
export const TAB_BAR_PADDING_TOP = 5
export const TAB_BAR_PADDING_HORIZONTAL = 4
/** Matches React Navigation UIKit tab item row height. */
export const TAB_BAR_CONTENT_HEIGHT = 49

/** iOS home indicator is covered by `insets.bottom`; minimal extra padding. */
const TAB_BAR_PADDING_BOTTOM_IOS = 8
/** Android 3-button nav often reports 0 safe-area — cushion above system buttons. */
const TAB_BAR_PADDING_BOTTOM_ANDROID = 20
const ANDROID_MIN_BOTTOM_INSET = 12

function getTabBarBottomPadding(insets: Pick<EdgeInsets, 'bottom'>): number {
  if (Platform.OS === 'android') {
    return TAB_BAR_PADDING_BOTTOM_ANDROID + Math.max(insets.bottom, ANDROID_MIN_BOTTOM_INSET)
  }
  return TAB_BAR_PADDING_BOTTOM_IOS + insets.bottom
}

/** Total tab bar height including safe-area padding (guest + signed-in). */
export function getTabBarHeight(insets: Pick<EdgeInsets, 'bottom'>): number {
  const paddingBottom = getTabBarBottomPadding(insets)
  return TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING_TOP + paddingBottom
}

/**
 * Tab bar style passed to React Navigation's `tabBarStyle`.
 * Background MUST be 'transparent' so the BlurView underneath shows through.
 */
export function getTabBarStyle(insets: Pick<EdgeInsets, 'bottom'>): ViewStyle {
  const paddingBottom = getTabBarBottomPadding(insets)
  const height = getTabBarHeight(insets)

  return {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom,
    paddingHorizontal: TAB_BAR_PADDING_HORIZONTAL,
    height,
  }
}

/** Studio quick menu sheet bottom padding above home indicator / gesture bar. */
export function getStudioSheetBottomPadding(insets: Pick<EdgeInsets, 'bottom'>): number {
  if (Platform.OS === 'android') {
    return Math.max(insets.bottom, ANDROID_MIN_BOTTOM_INSET) + 16
  }
  return Math.max(insets.bottom, 16) + 12
}
