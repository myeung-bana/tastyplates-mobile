import { Image, View } from 'react-native'

const LOGO = require('@/assets/AppIcons/appstore.png')

/**
 * Centered app mark (~28px tall) for onboarding steps.
 */
export function OnboardingLogo(): JSX.Element {
  return (
    <View className="mb-6 items-center">
      <Image
        source={LOGO}
        accessibilityIgnoresInvertColors
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
    </View>
  )
}
