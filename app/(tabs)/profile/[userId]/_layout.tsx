import { Stack } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'

/** Nested routes for another user (`/(tabs)/profile/[slug]/…`). */
export default function PublicProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: TEXT_HEADING,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Profile' }} />
      <Stack.Screen name="followers" options={{ title: 'Followers' }} />
      <Stack.Screen name="following" options={{ title: 'Following' }} />
      <Stack.Screen name="reviews" options={{ title: 'All reviews' }} />
    </Stack>
  )
}
