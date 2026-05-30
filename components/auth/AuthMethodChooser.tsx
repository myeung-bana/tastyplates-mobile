import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

type AuthMethodChooserProps = {
  onSignUpFree: () => void
  onContinueWithEmail: () => void
  onContinueWithGoogle: () => void
  onSkipLogin?: () => void
  googleBusy?: boolean
}

/**
 * Initial auth step after Get Started — three centered actions (no sign-in/sign-up tabs).
 */
export function AuthMethodChooser({
  onSignUpFree,
  onContinueWithEmail,
  onContinueWithGoogle,
  onSkipLogin,
  googleBusy = false,
}: AuthMethodChooserProps): JSX.Element {
  return (
    <View className="items-center pb-4">
      <Pressable
        accessibilityRole="button"
        onPress={onSignUpFree}
        disabled={googleBusy}
        className="mb-3 w-full max-w-sm items-center rounded-full py-4 active:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: BRAND_PRIMARY }}
      >
        <Text className="text-base font-semibold text-white">Sign Up Free</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={googleBusy}
        onPress={onContinueWithGoogle}
        className="mb-3 w-full max-w-sm flex-row items-center justify-center gap-3 rounded-full border bg-white px-5 py-3.5 active:bg-gray-50 disabled:opacity-50"
        style={{ borderColor: '#d1d5db', borderWidth: 1 }}
      >
        {googleBusy ? (
          <ActivityIndicator color={TEXT_HEADING} />
        ) : (
          <>
            <Ionicons name="logo-google" size={22} color="#4285F4" />
            <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
              Continue with Google
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onContinueWithEmail}
        disabled={googleBusy}
        className="w-full max-w-sm items-center rounded-full border bg-white px-5 py-3.5 active:bg-gray-50 disabled:opacity-50"
        style={{ borderColor: '#d1d5db', borderWidth: 1 }}
      >
        <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
          Continue with Email
        </Text>
      </Pressable>

      {onSkipLogin ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse without signing in"
          onPress={onSkipLogin}
          disabled={googleBusy}
          className="mt-6 w-full max-w-sm items-center py-2 active:opacity-70 disabled:opacity-50"
        >
          <Text className="text-sm font-medium text-gray-500">Skip login for now</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
