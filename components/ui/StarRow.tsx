import { Text, View } from 'react-native'

import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'
import { FONT } from '@/constants/typography'

/** Five ★ with the score after them (design P1/P2 "Latest" and Reviews grid). */
export function StarRow({ value, size = 12 }: { value: number | null | undefined; size?: number }): JSX.Element | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  const filled = Math.round(value)
  return (
    <View
      className="flex-row items-center"
      style={{ gap: 1 }}
      accessible
      accessibilityLabel={`Rated ${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: i <= filled ? BRAND_PRIMARY : BORDER_SUBTLE }}>
          ★
        </Text>
      ))}
      <Text style={{ marginLeft: 5, fontFamily: FONT.bodySemibold, fontSize: 12, color: TEXT_HEADING }}>{value.toFixed(1)}</Text>
    </View>
  )
}
