import { Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Inner padding below the status bar / Dynamic Island — matches {@link AppTopNav}. */
export const FULL_SCREEN_OVERLAY_INNER_PAD = 12

/** Conservative iOS fallback when Modal insets are unavailable (notch / Dynamic Island). */
const IOS_MIN_TOP_INSET = 47

function resolveTopInset(rawTop: number): number {
  if (rawTop > 0) return rawTop
  if (Platform.OS === 'ios') return IOS_MIN_TOP_INSET
  return StatusBar.currentHeight ?? 24
}

function resolveBottomInset(rawBottom: number): number {
  if (rawBottom > 0) return rawBottom
  return Platform.OS === 'ios' ? 34 : 0
}

/**
 * Safe-area padding for full-screen Modals (`statusBarTranslucent`).
 * Prefer this over `SafeAreaView` inside Modals — insets are applied explicitly
 * so chrome clears the battery, notch, Dynamic Island, and home indicator.
 */
export function useFullScreenOverlayInsets(extraTop = 0, extraBottom = 0) {
  const insets = useSafeAreaInsets()

  const top = resolveTopInset(insets.top) + FULL_SCREEN_OVERLAY_INNER_PAD + extraTop
  const bottom = resolveBottomInset(insets.bottom) + FULL_SCREEN_OVERLAY_INNER_PAD + extraBottom
  const left = insets.left + FULL_SCREEN_OVERLAY_INNER_PAD
  const right = insets.right + FULL_SCREEN_OVERLAY_INNER_PAD

  return { top, bottom, left, right, insets }
}
