import { Stack } from 'expo-router'

export default function ProfileRootLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="[userId]" options={{ headerShown: false }} />
    </Stack>
  )
}
