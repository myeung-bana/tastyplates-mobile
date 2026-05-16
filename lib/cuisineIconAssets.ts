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
