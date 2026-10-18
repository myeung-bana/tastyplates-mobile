import { Stack } from 'expo-router'

import { STACK_DETAIL_HEADER_OPTIONS } from '@/constants/stackHeader'

/** Single tab route `hashtag`; dynamic hashtag screen stays in-stack. */
export default function HashtagLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        ...STACK_DETAIL_HEADER_OPTIONS,
        headerShown: true,
        contentStyle: { backgroundColor: '#ffffff' },
        animation: 'slide_from_right',
      }}
    />
  )
}
