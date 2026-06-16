import { Stack } from 'expo-router'

import { STACK_DETAIL_HEADER_OPTIONS } from '@/constants/stackHeader'
import { TEXT_HEADING } from '@/constants/brand'

/** Nested routes for another user (`/(tabs)/profile/[slug]/…`). */
export default function PublicProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_DETAIL_HEADER_OPTIONS,
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Profile' }} />
      <Stack.Screen name="connections" options={{ headerShown: false, title: 'Follows' }} />
      <Stack.Screen name="followers" options={{ headerShown: false, title: 'Follows' }} />
      <Stack.Screen name="following" options={{ headerShown: false, title: 'Follows' }} />
      <Stack.Screen name="reviews" options={{ title: 'All reviews', headerTintColor: TEXT_HEADING }} />
    </Stack>
  )
}
