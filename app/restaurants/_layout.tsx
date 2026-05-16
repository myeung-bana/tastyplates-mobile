import { Stack } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'

export default function RestaurantsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: TEXT_HEADING,
        headerStyle: { backgroundColor: '#ffffff' },
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    />
  )
}
