import type { TextStyle } from 'react-native'

import { FONT } from '@/constants/typography'

/** Primary brand orange — brand v1.0. */
export const BRAND_PRIMARY = '#FF7C09'

/** Pressed / link-hover orange. */
export const BRAND_PRIMARY_DARK = '#C25400'

/** Soft orange tint — selected chips, banners. */
export const BRAND_PRIMARY_TINT = '#FFF3E8'

/** Image fallback field + quiet fills (brand “fog”). */
export const SURFACE_FOG = '#EFEFF1'

/** Raised card / sheet surface. */
export const SURFACE_CARD = '#FCFCFC'

/** Fallback pin glyph on {@link SURFACE_FOG}. */
export const FALLBACK_GLYPH = '#D5D7DD'

/** Destructive actions (delete, block, errors). */
export const DANGER = '#D93A2B'

/** Success ticks (password checks, saved states). */
export const SUCCESS = '#2F7A4A'

/** Article category pill background (inline headers). */
export const ARTICLE_CATEGORY_BG = '#fef7f0'

/** Typography & UI neutrals — design_system §2.3–2.4, §5.3 Card. */
export const TEXT_HEADING = '#31343F'
export const TEXT_BODY = '#555966'
export const TEXT_MUTED = '#555966'
/** Placeholders, timestamps, meta lines. */
export const TEXT_TERTIARY = '#8B8F9A'
export const BORDER_SUBTLE = '#DCDDE2'
/** Outlined buttons / inactive profile tabs — Share profile, settings circle, etc. */
export const BORDER_OUTLINE = '#d1d5db'

/** Default nav chrome icons — top search, inactive tab icons (Tailwind gray-700). */
export const NAV_ICON = '#374151'

/** Stars / aggregate rating accent — design_system §2.4 (Tailwind amber-400). Metric hero rows only. */
export const RATING_STAR = '#f59e0b'

/** Inline rating star (cards, feeds, review viewer) — always black ink, not amber. */
export const RATING_STAR_INK = '#171717'

/** Base typography for `TextInput` so placeholder uses the same family as `<Text>`. */
export function mergeTextInputBodyTypography(extra?: TextStyle): TextStyle {
  const base: TextStyle = { fontFamily: FONT.body, fontSize: 16 }
  return extra ? { ...base, ...extra } : base
}
