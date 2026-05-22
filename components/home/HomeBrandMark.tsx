import { View } from 'react-native'

import TastyLogo from '@/assets/icons/TastyPlates_Logo_Colour.svg'

const VIEWBOX_W = 199
const VIEWBOX_H = 35
/** Display width in dp; height keeps SVG aspect ratio. */
const DISPLAY_WIDTH = 200

/** Centered colour wordmark for the home feed (below nav). */
export function HomeBrandMark() {
  const aspect = DISPLAY_WIDTH * (VIEWBOX_H / VIEWBOX_W)

  return (
    <View accessibilityLabel="TastyPlates" accessibilityRole="image" className="items-center px-4 pb-2 pt-3">
      <TastyLogo accessible={false} importantForAccessibility="no" width={DISPLAY_WIDTH} height={aspect} />
    </View>
  )
}
