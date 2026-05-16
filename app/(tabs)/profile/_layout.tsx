import { Stack } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'

/** Profile tab — stack stays inside the tabs shell so bottom nav stays visible (`correction`/UX). */
export default function ProfileTabStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="edit"
        options={{
          headerShown: true,
          title: 'Edit profile',
          headerTitleAlign: 'center',
          headerTintColor: TEXT_HEADING,
        }}
      />
      <Stack.Screen name="[userId]" />
    </Stack>
  )
}
