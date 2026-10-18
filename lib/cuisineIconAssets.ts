import type { ImageSourcePropType } from 'react-native'

/**
 * Bundled cuisine icons under `assets/icons/cuisines/` (synced with web `public/icons/cuisines/`).
 * Keys must match `QuickFindItem.iconFile` in `constants/quickFinds.ts`.
 */
export const CUISINE_ICON_BY_FILENAME: Record<string, ImageSourcePropType> = {
  'japanese-cuisine.png': require('@/assets/icons/cuisines/japanese-cuisine.png'),
  'chinese-cuisine.png': require('@/assets/icons/cuisines/chinese-cuisine.png'),
  'korean-cuisine.png': require('@/assets/icons/cuisines/korean-cuisine.png'),
  'sea-cuisine.png': require('@/assets/icons/cuisines/sea-cuisine.png'),
  'italian-cuisine.png': require('@/assets/icons/cuisines/italian-cuisine.png'),
  'mexican-cuisine.png': require('@/assets/icons/cuisines/mexican-cuisine.png'),
  'indian-cuisine.png': require('@/assets/icons/cuisines/indian-cuisine.png'),
  'french-cuisine.png': require('@/assets/icons/cuisines/french-cuisine.png'),
  'middle-eastern-cuisine.png': require('@/assets/icons/cuisines/middle-eastern-cuisine.png'),
  'na-cuisine.png': require('@/assets/icons/cuisines/na-cuisine.png'),
}

export function getCuisineIconSource(iconFile: string): ImageSourcePropType | undefined {
  return CUISINE_ICON_BY_FILENAME[iconFile]
}

const ICON_BY_CUISINE: Record<string, string> = {
  japanese: 'japanese-cuisine.png',
  chinese: 'chinese-cuisine.png',
  taiwanese: 'chinese-cuisine.png',
  korean: 'korean-cuisine.png',
  italian: 'italian-cuisine.png',
  mexican: 'mexican-cuisine.png',
  french: 'french-cuisine.png',
}

const ICON_BY_REGION: Record<string, string> = {
  'South Asian': 'indian-cuisine.png',
  'South East Asian': 'sea-cuisine.png',
  'Middle Eastern': 'middle-eastern-cuisine.png',
  'North American': 'na-cuisine.png',
}

/**
 * Brand category icon for a leaf cuisine slug or region key: the cuisine's own icon, else its
 * region's icon. `undefined` when neither exists (callers fall back to the initial letter).
 */
export function getCuisineIconForSlug(
  slug: string,
  regionKey?: string | null,
): ImageSourcePropType | undefined {
  const key = slug.trim().toLowerCase()
  const file = ICON_BY_CUISINE[key] ?? (regionKey ? ICON_BY_REGION[regionKey] : undefined) ?? ICON_BY_REGION[slug]
  return file ? CUISINE_ICON_BY_FILENAME[file] : undefined
}
