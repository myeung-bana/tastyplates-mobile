import { NativeModules, Platform } from 'react-native'

/**
 * True when the native ExpoBlurView is linked in the running binary.
 * When false (stale dev client, Expo Go mismatch, web), skip BlurView to avoid
 * the red "Unimplemented component: BlurView" overlay.
 */
export function isExpoBlurAvailable(): boolean {
  if (Platform.OS === 'web') return false

  const metadata = NativeModules.NativeUnimoduleProxy?.viewManagersMetadata as
    | Record<string, unknown>
    | undefined
  if (metadata && 'ExpoBlurView' in metadata) return true

  const getViewConfig = globalThis.expo?.getViewConfig
  if (typeof getViewConfig === 'function' && getViewConfig('ExpoBlurView')) {
    return true
  }

  return false
}
