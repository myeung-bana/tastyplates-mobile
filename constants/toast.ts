import type { TextStyle, ViewStyle } from 'react-native'

/** Pill toast — dark overlay surface, white text (aligned with tastyplates-v2-1 web). */
export const TOAST_PILL_CONTAINER: ViewStyle = {
  backgroundColor: 'rgba(26, 26, 29, 0.92)',
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 9999,
  maxWidth: 400,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 16,
  elevation: 8,
}

export const TOAST_PILL_TEXT: TextStyle = {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '500',
  textAlign: 'center',
}

export const TOAST_DEFAULT_DURATION = 3000
export const TOAST_ERROR_DURATION = 5000
