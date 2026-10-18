import { Text } from 'react-native'

import { TEXT_BODY } from '@/constants/brand'
import { openLegalPage } from '@/lib/legalLinks'

export function LegalConsentText({
  prefix = 'By continuing you confirm you are 13 or older and agree to our',
}: {
  prefix?: string
}): JSX.Element {
  return (
    <Text className="text-center text-xs leading-relaxed" style={{ color: TEXT_BODY }}>
      {prefix}{' '}
      <Text
        accessibilityRole="link"
        className="underline"
        onPress={() => void openLegalPage('terms-of-service')}
      >
        Terms of Service
      </Text>
      ,{' '}
      <Text
        accessibilityRole="link"
        className="underline"
        onPress={() => void openLegalPage('content-guidelines')}
      >
        Content Guidelines
      </Text>{' '}
      and{' '}
      <Text
        accessibilityRole="link"
        className="underline"
        onPress={() => void openLegalPage('privacy-policy')}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  )
}
