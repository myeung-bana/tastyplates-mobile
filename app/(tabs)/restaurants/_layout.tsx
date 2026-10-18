import { Stack } from 'expo-router'

import { SURFACE_CARD, TEXT_HEADING } from '@/constants/brand'
import { headingFont } from '@/constants/typography'

export default function RestaurantsStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        /** Tab root (`index`) uses {@link AppTopNav} only; pushed routes keep a stack header + back. */
        headerShown: false,
        headerShadowVisible: false,
        headerTintColor: TEXT_HEADING,
        headerTitleStyle: { fontFamily: headingFont('600') },
        headerStyle: { backgroundColor: SURFACE_CARD },
        contentStyle: { backgroundColor: SURFACE_CARD },
      }}
    >
      <Stack.Screen name="[slug]" options={{ headerShown: true }} />
      <Stack.Screen name="cuisines/[slug]" options={{ headerShown: true, title: 'Cuisine' }} />
    </Stack>
  )
}
