import { Stack } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'

export default function RestaurantsStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        /** Tab root (`index`) uses {@link AppTopNav} only; pushed routes keep a stack header + back. */
        headerShown: false,
        headerShadowVisible: false,
        headerTintColor: TEXT_HEADING,
        headerStyle: { backgroundColor: '#ffffff' },
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="[slug]" options={{ headerShown: true }} />
      <Stack.Screen name="cuisines/[slug]" options={{ headerShown: true, title: 'Cuisine' }} />
    </Stack>
  )
}
