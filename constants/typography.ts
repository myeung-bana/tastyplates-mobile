import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans'
import { Jost_500Medium, Jost_600SemiBold, Jost_700Bold } from '@expo-google-fonts/jost'

/**
 * Brand v1.0 type: Jost for headings and titles, DM Sans for body and UI.
 *
 * React Native picks a font file by family name, not by `fontWeight`, so every weight is its own
 * family. Use these names (or the matching `font-body*` / `font-heading*` Tailwind classes) instead
 * of `fontWeight` / `font-semibold`.
 */
export const FONT = {
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemibold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  heading: 'Jost_600SemiBold',
  headingMedium: 'Jost_500Medium',
  headingBold: 'Jost_700Bold',
} as const

/** Passed to `useFonts` in the root layout. */
export const FONT_ASSETS = {
  [FONT.body]: DMSans_400Regular,
  [FONT.bodyMedium]: DMSans_500Medium,
  [FONT.bodySemibold]: DMSans_600SemiBold,
  [FONT.bodyBold]: DMSans_700Bold,
  [FONT.heading]: Jost_600SemiBold,
  [FONT.headingMedium]: Jost_500Medium,
  [FONT.headingBold]: Jost_700Bold,
}

type Weight = '400' | '500' | '600' | '700' | 'normal' | 'bold' | number | undefined

/** DM Sans family for a CSS-style weight (style objects). */
export function bodyFont(weight?: Weight): string {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight)
  if (w >= 700) return FONT.bodyBold
  if (w >= 600) return FONT.bodySemibold
  if (w >= 500) return FONT.bodyMedium
  return FONT.body
}

/** Jost family for a CSS-style weight (style objects). */
export function headingFont(weight?: Weight): string {
  const w = weight === 'bold' ? 700 : weight == null ? 600 : Number(weight)
  if (w >= 700) return FONT.headingBold
  if (w >= 600) return FONT.heading
  return FONT.headingMedium
}
