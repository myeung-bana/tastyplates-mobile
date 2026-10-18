import { Text } from 'react-native'

import { openLegalPage } from '@/lib/legalLinks'

export function ContentGuidelinesReminder(): JSX.Element {
  return (
    <Text className="font-neusans text-sm text-[#31343F]">
      By posting a review, you agree that you are above 13 years old and agree to TastyPlates&apos;{' '}
      <Text
        className="font-neusans text-sm text-[#31343F] underline"
        onPress={() => void openLegalPage('content-guidelines')}
      >
        Writing Guidelines
      </Text>
    </Text>
  )
}
