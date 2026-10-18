import { Pressable, Text, View } from 'react-native'

import { LegalConsentText } from '@/components/legal/LegalConsentText'
import { AppIcon } from '@/components/ui/AppIcon'
import { Button } from '@/components/ui/Button'
import { TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

type AuthMethodChooserProps = {
  onSignUpFree: () => void
  onContinueWithEmail: () => void
  onContinueWithGoogle: () => void
  /** Only when opened from get-started — never from a sign-in wall. */
  onSkipLogin?: () => void
  googleBusy?: boolean
  /** `wall` — signed-out action (like, comment, follow): Google, email, Not now. */
  variant?: 'default' | 'wall'
  onNotNow?: () => void
}

/** Auth chooser actions (design G2). Title and mark come from the sheet shell. */
export function AuthMethodChooser({
  onSignUpFree,
  onContinueWithEmail,
  onContinueWithGoogle,
  onSkipLogin,
  googleBusy = false,
  variant = 'default',
  onNotNow,
}: AuthMethodChooserProps): JSX.Element {
  const google = (
    <Button
      variant={variant === 'wall' ? 'primary' : 'secondary'}
      onPress={onContinueWithGoogle}
      loading={googleBusy}
      accessibilityLabel="Continue with Google"
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <AppIcon name="logo-google" size={20} color={variant === 'wall' ? '#FFFFFF' : '#4285F4'} />
        <Text
          style={{
            fontFamily: FONT.heading,
            fontSize: 17,
            letterSpacing: 0.6,
            color: variant === 'wall' ? '#FFFFFF' : TEXT_HEADING,
          }}
        >
          Continue with Google
        </Text>
      </View>
    </Button>
  )

  if (variant === 'wall') {
    return (
      <View style={{ gap: 10 }}>
        {google}
        <Button variant="secondary" onPress={onContinueWithEmail} disabled={googleBusy}>
          Continue with email
        </Button>
        {onNotNow ? (
          <Pressable
            accessibilityRole="button"
            onPress={onNotNow}
            className="items-center justify-center active:opacity-70"
            style={{ height: 44 }}
          >
            <Text style={{ fontFamily: FONT.bodyMedium, fontSize: 15, color: TEXT_MUTED }}>Not now</Text>
          </Pressable>
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Button onPress={onSignUpFree} disabled={googleBusy}>
          Sign up free
        </Button>
        <Button variant="secondary" onPress={onContinueWithEmail} disabled={googleBusy}>
          Continue with email
        </Button>
        {google}
      </View>

      {onSkipLogin ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip login and browse as a guest"
          onPress={onSkipLogin}
          disabled={googleBusy}
          className="items-center active:opacity-70"
          style={{ paddingVertical: 4 }}
        >
          <Text
            style={{
              fontFamily: FONT.bodyMedium,
              fontSize: 15,
              color: TEXT_HEADING,
              textDecorationLine: 'underline',
            }}
          >
            Skip login
          </Text>
        </Pressable>
      ) : null}

      <LegalConsentText />
    </View>
  )
}
