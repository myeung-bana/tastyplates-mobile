import { Text, View } from 'react-native'

import {
  BRAND_PRIMARY,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

interface RestaurantMapPinProps {
  isSelected: boolean
  rating?: number | null
  /** Google-only place — dashed "G" pill. */
  isGoogle?: boolean
  /** 0–100 under a palate cuisine filter — orange "94%" pill. */
  matchPercent?: number | null
}

/** Map marker pill (design S2/S4): ★ rating, G rating for Google places, or palate match %. */
export function RestaurantMapPin({
  isSelected,
  rating,
  isGoogle = false,
  matchPercent = null,
}: RestaurantMapPinProps): JSX.Element {
  const match = matchPercent != null
  const label = match
    ? `${matchPercent}%`
    : `${isGoogle ? 'G' : '★'} ${rating != null && rating > 0 ? rating.toFixed(1) : '–'}`

  const background = match ? BRAND_PRIMARY : isSelected ? TEXT_HEADING : SURFACE_CARD
  const color = match || isSelected ? (match ? TEXT_HEADING : '#FFFFFF') : isGoogle ? TEXT_MUTED : TEXT_HEADING

  return (
    <View
      style={{
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 50,
        backgroundColor: background,
        borderWidth: isGoogle && !isSelected && !match ? 1 : 0,
        borderStyle: 'dashed',
        borderColor: TEXT_TERTIARY,
        transform: [{ scale: isSelected ? 1.12 : 1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 12, color }}>{label}</Text>
    </View>
  )
}
