import { View } from 'react-native'

import TastyLogo from '@/assets/icons/TastyPlates_Logo_Colour.svg'

const VIEWBOX_W = 199
const VIEWBOX_H = 35
/** 24pt-tall wordmark, left-aligned above the hero headline (design G8 / H1). */
const DISPLAY_HEIGHT = 24

export function HomeBrandMark() {
  return (
    <View
      accessibilityLabel="Tastyplates"
      accessibilityRole="image"
      style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}
    >
      <TastyLogo
        accessible={false}
        importantForAccessibility="no"
        height={DISPLAY_HEIGHT}
        width={Math.round(DISPLAY_HEIGHT * (VIEWBOX_W / VIEWBOX_H))}
      />
    </View>
  )
}
