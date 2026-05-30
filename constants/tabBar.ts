import type { ViewStyle } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'

export const TAB_BAR_BG = '#ffffff'
export const TAB_BAR_BORDER = '#f3f4f6'
export const TAB_BAR_PADDING_TOP = 11
/** Previous 10px + requested 10px extra (safe-area added separately). */
export const TAB_BAR_PADDING_BOTTOM_BASE = 20
export const TAB_BAR_PADDING_HORIZONTAL = 4

/** Bottom tab bar style with platform safe-area inset (no fixed height). */
export function getTabBarStyle(insets: Pick<EdgeInsets, 'bottom'>): ViewStyle {
  return {
    backgroundColor: TAB_BAR_BG,
    borderTopWidth: 1,
    borderTopColor: TAB_BAR_BORDER,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: TAB_BAR_PADDING_BOTTOM_BASE + insets.bottom,
    paddingHorizontal: TAB_BAR_PADDING_HORIZONTAL,
  }
}

/** Studio quick menu sheet bottom padding above home indicator / gesture bar. */
export function getStudioSheetBottomPadding(insets: Pick<EdgeInsets, 'bottom'>): number {
  return Math.max(insets.bottom, 16) + 12
}
