import { Stack } from 'expo-router'

import { EditProfileDraftProvider } from '@/contexts/EditProfileDraftContext'

/** Profile tab — stack stays inside the tabs shell so bottom nav stays visible (`correction`/UX). */
export default function ProfileTabStackLayout() {
  return (
    <EditProfileDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="edit" options={{ headerShown: false }} />
        <Stack.Screen name="edit-palates" options={{ headerShown: false }} />
        <Stack.Screen name="[userId]" />
      </Stack>
    </EditProfileDraftProvider>
  )
}
