import { useCallback } from 'react'
import * as Haptics from 'expo-haptics'

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

/**
 * Haptic feedback wrapper.
 *
 * Returns a function that triggers the requested feedback style.
 * Safe to call on Android (no-ops gracefully when haptics are unavailable).
 */
export function useHaptic(style: HapticStyle = 'light') {
  return useCallback(() => {
    switch (style) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null)
        break
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null)
        break
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => null)
        break
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null)
        break
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null)
        break
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null)
        break
    }
  }, [style])
}
