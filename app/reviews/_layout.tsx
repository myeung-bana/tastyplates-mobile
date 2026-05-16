import { Stack } from 'expo-router'

/** Review routes (viewer, future nested screens) share a stack for predictable back gestures. */
export default function ReviewsLayout() {
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
