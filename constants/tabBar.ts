import { Platform } from 'react-native'
import type { ViewStyle } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'

/**
 * Tab bar background token — page chrome and scrims.
 */
export const TAB_BAR_BG = '#ffffff'

/** Horizontal inset for the floating pill from screen edges. */
export const PILL_H_INSET = 10

/** Gap between pill bottom and home indicator / gesture bar. */
export const PILL_BOTTOM_MARGIN = 10

/** Extra downward offset for tab icons in the expanded pill. */
export const TAB_BAR_ICON_TOP_OFFSET = 5

/** Expanded pill height (icons only). */
export const PILL_EXPANDED_HEIGHT = 55

/** Compact pill height when scrolling up. */
export const PILL_COMPACT_HEIGHT = 45

/** Solid pill surface — consistent on simulator and device (no blur split). */
export const PILL_SURFACE_COLOR = 'rgba(255, 255, 255, 0.96)'

export const PILL_BORDER_COLOR = 'rgba(0, 0, 0, 0.06)'

/** @deprecated Blur path retired for floating pill — kept for reference. */
export const TAB_BAR_TINT_OPACITY = 0.32
export const TAB_BAR_BLUR_INTENSITY = 65
export const TAB_BAR_FALLBACK_OPACITY = 0.48
export const TAB_BAR_SCRIM_HEIGHT = 32
export const TAB_BAR_PADDING_TOP = 0
export const TAB_BAR_PADDING_HORIZONTAL = 4
export const TAB_BAR_CONTENT_HEIGHT = PILL_EXPANDED_HEIGHT

/** Bottom safe-area padding used by legacy layouts. */
export function getTabBarBottomPadding(insets: Pick<EdgeInsets, 'bottom'>): number {
  if (Platform.OS === 'android') {
    return 20 + Math.max(insets.bottom, 12)
  }
  return 8 + insets.bottom
}

/** Vertical space reserved above page content for the floating pill. */
export function getFloatingTabBarOccupiedHeight(insets: Pick<EdgeInsets, 'bottom'>): number {
  return PILL_EXPANDED_HEIGHT + PILL_BOTTOM_MARGIN + insets.bottom
}

/**
 * Tab scene `paddingBottom` — floating pill overlays content on iOS (0).
 * Android reserves space so the viewport ends above the nav + gesture bar.
 */
export function getTabSceneStylePaddingBottom(insets: Pick<EdgeInsets, 'bottom'>): number {
  if (Platform.OS === 'android') {
    return getFloatingTabBarOccupiedHeight(insets)
  }
  return 0
}

/** @alias {@link getFloatingTabBarOccupiedHeight} — use {@link getTabSceneStylePaddingBottom} for scene layout. */
export function getTabBarHeight(insets: Pick<EdgeInsets, 'bottom'>): number {
  return getFloatingTabBarOccupiedHeight(insets)
}

/**
 * Tab bar style passed to React Navigation's `tabBarStyle`.
 * Background MUST stay transparent — pill chrome renders behind {@link BottomTabBar}.
 */
export function getTabBarStyle(_insets: Pick<EdgeInsets, 'bottom'>): ViewStyle {
  return {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: TAB_BAR_PADDING_TOP,
    paddingHorizontal: TAB_BAR_PADDING_HORIZONTAL,
  }
}

/** Studio quick menu sheet bottom padding above home indicator / gesture bar. */
export function getStudioSheetBottomPadding(insets: Pick<EdgeInsets, 'bottom'>): number {
  if (Platform.OS === 'android') {
    return Math.max(insets.bottom, 12) + 16
  }
  return Math.max(insets.bottom, 16) + 12
}
