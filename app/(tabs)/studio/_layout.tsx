import { ActivityIndicator, View } from 'react-native'
import { Redirect, Stack, usePathname } from 'expo-router'

import { TEXT_HEADING } from '@/constants/brand'
import { STACK_DETAIL_HEADER_OPTIONS } from '@/constants/stackHeader'
import { SCREEN_STUDIO_ENTRY } from '@/constants/screens'
import { useAuth } from '@/hooks/useAuth'
import { loginScreenHref } from '@/lib/authRoutes'

/**
 * TastyStudio stack — auth gated. Tab entry is `index`; child routes omit `(tabs)` in path constants.
 */
export default function StudioSectionLayout(): JSX.Element {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={TEXT_HEADING} />
      </View>
    )
  }

  if (!isAuthenticated) {
    const onStudioPath = pathname != null && pathname.includes('studio')
    const resumeTarget = onStudioPath ? pathname : SCREEN_STUDIO_ENTRY
    return <Redirect href={loginScreenHref({ resume: resumeTarget })} />
  }

  return (
    <Stack
      screenOptions={{
        ...STACK_DETAIL_HEADER_OPTIONS,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add-review/index" options={{ headerShown: false }} />
      <Stack.Screen name="add-review/[slug]" options={{ title: 'Write review' }} />
      <Stack.Screen name="add-review/create" options={{ title: 'Write review' }} />
      <Stack.Screen name="add-review/success" options={{ headerShown: false }} />
      <Stack.Screen name="review-listing" options={{ title: 'Manage Reviews' }} />
      <Stack.Screen name="edit-review/[id]" options={{ title: 'Edit review' }} />
      <Stack.Screen name="my-lists/index" options={{ title: 'To Dine / Check-Ins' }} />
      <Stack.Screen name="manage-lists/index" options={{ title: 'Manage Lists' }} />
      <Stack.Screen name="manage-lists/create" options={{ title: 'New List' }} />
      <Stack.Screen name="manage-lists/[uuid]/index" options={{ title: 'List' }} />
      <Stack.Screen name="manage-lists/[uuid]/edit" options={{ title: 'Edit List' }} />
      <Stack.Screen name="manage-lists/[uuid]/add" options={{ title: 'Add Restaurant' }} />
    </Stack>
  )
}
