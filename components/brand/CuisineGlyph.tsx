import type { ReactNode } from 'react'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'

import { BRAND_PRIMARY } from '@/constants/brand'

/**
 * Brand v1.0 cuisine line glyphs (design H1 "Quick finds"), drawn on a 24×24 grid with a
 * 1.75 round stroke. Keys are cuisine slugs.
 */
const GLYPHS: Record<string, ReactNode> = {
  korean: (
    <>
      <Path d="M4 12h16c0 4-3.6 7-8 7s-8-3-8-7z" />
      <Line x1="9" y1="8.5" x2="10" y2="8.5" />
      <Line x1="11.5" y1="7" x2="12.5" y2="7" />
      <Line x1="14" y1="8.5" x2="15" y2="8.5" />
    </>
  ),
  chinese: (
    <>
      <Line x1="6" y1="7" x2="19" y2="4.5" />
      <Line x1="4" y1="10" x2="20" y2="10" />
      <Line x1="8" y1="10" x2="8" y2="19" />
      <Line x1="11" y1="10" x2="11" y2="19" />
      <Line x1="14" y1="10" x2="14" y2="19" />
    </>
  ),
  japanese: (
    <>
      <Path d="M3.5 12c0-2.8 3.8-4.5 8.5-4.5s8.5 1.7 8.5 4.5z" />
      <Rect x="4.5" y="12" width="15" height="6.5" rx="3.25" />
      <Line x1="10" y1="8" x2="10" y2="18.5" />
      <Line x1="14" y1="8" x2="14" y2="18.5" />
    </>
  ),
  thai: (
    <>
      <Path d="M5 19.5c6.5 0 11-5.5 11-11.5 0-1.2-.8-2-2-2s-2 .8-2 2c0 5-3 9-7 10.5-.8.3-.6 1 0 1z" />
      <Path d="M14 6c0-1.5.8-2.5 2-3" />
    </>
  ),
  italian: (
    <>
      <Path d="M4 6.5c5-2.6 11-2.6 16 0L12 21z" />
      <Path d="M5.6 9c4-1.8 8.8-1.8 12.8 0" />
      <Circle cx="10" cy="11.5" r="1.1" />
      <Circle cx="13.6" cy="14.2" r="1.1" />
    </>
  ),
  vietnamese: (
    <>
      <Path d="M3 15c0-4 6-7 12-7 4 0 6 1.5 6 3.5 0 4-6 6.5-12 6.5-4 0-6-1-6-3z" />
      <Line x1="9" y1="10" x2="10.5" y2="12.5" />
      <Line x1="12" y1="9.2" x2="13.5" y2="11.8" />
      <Line x1="15" y1="8.8" x2="16.5" y2="11.2" />
    </>
  ),
  indian: (
    <>
      <Path d="M4 12h16c0 4-3.6 7-8 7s-8-3-8-7z" />
      <Path d="M9 9.5c-.6-1 .6-1.6 0-3.2" />
      <Path d="M12 9.5c-.6-1 .6-1.6 0-3.2" />
      <Path d="M15 9.5c-.6-1 .6-1.6 0-3.2" />
    </>
  ),
  mexican: (
    <>
      <Path d="M3 18a9 9 0 0 1 18 0z" />
      <Path d="M7.5 18a4.5 4.5 0 0 1 9 0" />
      <Path d="M8 9.8c1.2-.9 2.6-1.2 4-1.2s2.8.3 4 1.2" />
    </>
  ),
  french: (
    <>
      <Path d="M3 17c1-5 4-9 9-9s8 4 9 9c-2 1-4 0-5-1-1 1.5-2.5 2-4 2s-3-.5-4-2c-1 1-3 2-5 1z" />
      <Line x1="10" y1="8.6" x2="10.6" y2="16.5" />
      <Line x1="14" y1="8.6" x2="13.4" y2="16.5" />
    </>
  ),
  ethiopian: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Circle cx="9.6" cy="10" r="1.6" />
      <Circle cx="14.4" cy="10" r="1.6" />
      <Circle cx="12" cy="14.6" r="1.6" />
    </>
  ),
}

export function hasCuisineGlyph(slug: string): boolean {
  return slug.trim().toLowerCase() in GLYPHS
}

type Props = {
  slug: string
  size?: number
  color?: string
}

/** Renders the design glyph for `slug`, or nothing when there isn't one. */
export function CuisineGlyph({ slug, size = 26, color = BRAND_PRIMARY }: Props): JSX.Element | null {
  const glyph = GLYPHS[slug.trim().toLowerCase()]
  if (!glyph) return null
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
    >
      {glyph}
    </Svg>
  )
}
