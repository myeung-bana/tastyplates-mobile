import { Stack } from 'expo-router'

/** Single tab route `listing` — avoids hoisting each step as its own tab bar item. */
export default function ListingLayout(): JSX.Element {
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
