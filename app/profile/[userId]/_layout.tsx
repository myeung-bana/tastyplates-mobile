import { Stack } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'

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
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="followers" options={{ title: 'Followers' }} />
      <Stack.Screen name="following" options={{ title: 'Following' }} />
    </Stack>
  )
}
