import { Platform } from 'react-native'

/**
 * Copy text to the clipboard without a top-level expo-clipboard import.
 * expo-clipboard requires a dev-client rebuild after install; this helper
 * falls back gracefully when the native module is unavailable.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      return false
    }
    return false
  }

  try {
    const Clipboard = await import('expo-clipboard')
    await Clipboard.setStringAsync(text)
    return true
  } catch {
    return false
  }
}
