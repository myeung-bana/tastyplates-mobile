import { Stack } from 'expo-router'

/** Single tab route `settings`; nested screens stay off the tab bar. */
export default function SettingsLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
        animation: 'slide_from_right',
      }}
    />
  )
}
