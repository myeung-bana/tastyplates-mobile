import { Platform, type TextStyle } from 'react-native'

/** Primary brand orange — aligned with tastyplates-v2-1 web. */
export const BRAND_PRIMARY = '#ff7c0a'

/** Typography & UI neutrals — design_system §2.3–2.4, §5.3 Card. */
export const TEXT_HEADING = '#31343F'
export const TEXT_BODY = '#494D5D'
export const TEXT_MUTED = '#6b7280'
export const BORDER_SUBTLE = '#e5e7eb'

/** Stars / aggregate rating accent — design_system §2.4 (Tailwind amber-400). */
export const RATING_STAR = '#f59e0b'

/** Base typography for `TextInput` so placeholder uses the same family as `<Text>` (e.g. primary buttons use `System` on iOS). */
export function mergeTextInputBodyTypography(extra?: TextStyle): TextStyle {
  const base: TextStyle =
    Platform.OS === 'ios'
      ? { fontFamily: 'System', fontSize: 16 }
      : { fontSize: 16 }
  return extra ? { ...base, ...extra } : base
}
