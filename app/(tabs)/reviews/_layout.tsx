import { Stack } from 'expo-router'

import { STACK_DETAIL_HEADER_OPTIONS } from '@/constants/stackHeader'

/** Review routes — stack headers aligned with TastyStudio (Manage Reviews). */
export default function ReviewsLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_DETAIL_HEADER_OPTIONS,
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="viewer" options={{ headerShown: true, title: 'Review' }} />
      <Stack.Screen name="[reviewId]/comments" options={{ headerShown: true, title: 'Comments' }} />
    </Stack>
  )
}
