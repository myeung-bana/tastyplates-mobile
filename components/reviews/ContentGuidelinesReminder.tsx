import { Linking, Text } from 'react-native'

import { SCREEN_CONTENT_GUIDELINES } from '@/constants/screens'

const GUIDELINES_URL = 'https://tastyplates.co/content-guidelines'

export function ContentGuidelinesReminder(): JSX.Element {
  return (
    <Text className="font-neusans text-sm text-[#31343F]">
      By posting a review, you agree that you are above 13 years old and agree to TastyPlates&apos;{' '}
      <Text
        className="font-neusans text-sm text-[#31343F] underline"
        onPress={() => {
          void Linking.openURL(GUIDELINES_URL).catch(() => {
            void Linking.openURL(SCREEN_CONTENT_GUIDELINES as string)
          })
        }}
      >
        Writing Guidelines
      </Text>
    </Text>
  )
}
