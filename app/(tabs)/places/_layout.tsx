import { Stack } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'

/** Single tab route `places`; Google place detail stays in-stack. */
export default function PlacesLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerTintColor: TEXT_HEADING,
        headerStyle: { backgroundColor: '#ffffff' },
        contentStyle: { backgroundColor: '#ffffff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="google/[place_id]" options={{ headerShown: true }} />
    </Stack>
  )
}
