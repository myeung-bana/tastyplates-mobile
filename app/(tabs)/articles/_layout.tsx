import { Stack } from 'expo-router'

import { STACK_DETAIL_HEADER_OPTIONS } from '@/constants/stackHeader'

export default function ArticlesLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_DETAIL_HEADER_OPTIONS,
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[slug]" options={{ headerShown: true, title: 'Article' }} />
    </Stack>
  )
}
