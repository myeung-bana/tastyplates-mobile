import { Pressable, Text } from 'react-native'

export function SettingsLogoutButton({
  signingOut,
  onPress,
}: {
  signingOut: boolean
  onPress: () => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log out"
      accessibilityHint="Signs you out of your account"
      disabled={signingOut}
      onPress={onPress}
      className="mt-6 items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 active:bg-gray-50"
      style={signingOut ? { opacity: 0.6 } : undefined}
    >
      <Text className="text-base font-medium text-red-600">
        {signingOut ? 'Logging out…' : 'Log out'}
      </Text>
    </Pressable>
  )
}
