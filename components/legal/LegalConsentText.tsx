import { Text } from 'react-native'

import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { openLegalPage, type LegalPageSlug } from '@/lib/legalLinks'

function LegalLink({ page, children }: { page: LegalPageSlug; children: string }): JSX.Element {
  return (
    <Text
      accessibilityRole="link"
      onPress={() => void openLegalPage(page)}
      style={{ color: TEXT_HEADING, textDecorationLine: 'underline' }}
    >
      {children}
    </Text>
  )
}

/** 13+ and Terms / Content Guidelines / Privacy consent line (design G2, G3). Links open in-app. */
export function LegalConsentText({
  prefix = 'By continuing you confirm you’re 13 or older and agree to our',
}: {
  prefix?: string
}): JSX.Element {
  return (
    <Text
      className="text-center"
      style={{ fontFamily: FONT.body, fontSize: 12, lineHeight: 19, color: TEXT_MUTED }}
    >
      {prefix} <LegalLink page="terms-of-service">Terms</LegalLink>,{' '}
      <LegalLink page="content-guidelines">Content Guidelines</LegalLink> and{' '}
      <LegalLink page="privacy-policy">Privacy Policy</LegalLink>.
    </Text>
  )
}
