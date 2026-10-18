import { Text } from 'react-native'

import { openLegalPage } from '@/lib/legalLinks'

export function ContentGuidelinesReminder(): JSX.Element {
  return (
    <Text className="text-sm text-[#31343F] font-body">
      By posting a review, you agree that you are above 13 years old and agree to TastyPlates&apos;{' '}
      <Text
        className="text-sm text-[#31343F] underline font-body"
        onPress={() => void openLegalPage('content-guidelines')}
      >
        Writing Guidelines
      </Text>
    </Text>
  )
}
