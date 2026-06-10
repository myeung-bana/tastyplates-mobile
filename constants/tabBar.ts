import { Platform } from 'react-native'
import type { ViewStyle } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'

export const TAB_BAR_BG = '#ffffff'
export const TAB_BAR_BORDER = '#f3f4f6'
export const TAB_BAR_PADDING_TOP = 11
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

/** Bottom tab bar style — explicit height so padding does not clip labels (guest + signed-in). */
export function getTabBarStyle(insets: Pick<EdgeInsets, 'bottom'>): ViewStyle {
  const paddingBottom = getTabBarBottomPadding(insets)
  const height = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING_TOP + paddingBottom

  return {
    backgroundColor: TAB_BAR_BG,
    borderTopWidth: 1,
    borderTopColor: TAB_BAR_BORDER,
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
