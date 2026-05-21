import { Stack } from 'expo-router'

/** Single tab route `hashtag`; dynamic hashtag screen stays in-stack. */
export default function HashtagLayout(): JSX.Element {
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
