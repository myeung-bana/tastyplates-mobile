import { Stack } from 'expo-router'

/** Single tab route `places`; Google place detail stays in-stack. */
export default function PlacesLayout(): JSX.Element {
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
