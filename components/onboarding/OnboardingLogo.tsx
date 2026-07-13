import { View } from 'react-native'

import TastyLogo from '@/assets/icons/TastyPlates_Logo_Colour.svg'

const VIEWBOX_W = 199
const VIEWBOX_H = 35
const DISPLAY_WIDTH = 150

/** Centered colour wordmark for onboarding steps. */
export function OnboardingLogo(): JSX.Element {
  const aspect = DISPLAY_WIDTH * (VIEWBOX_H / VIEWBOX_W)

  return (
    <View className="mb-6 items-center">
      <TastyLogo
        accessible={false}
        importantForAccessibility="no"
        width={DISPLAY_WIDTH}
        height={aspect}
      />
    </View>
  )
}
