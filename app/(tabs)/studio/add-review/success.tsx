import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_HOME, SCREEN_STUDIO_REVIEW_LISTING } from '@/constants/screens'
import { firstSegmentParam } from '@/lib/routeParams'

export default function AddReviewSuccessScreen(): JSX.Element {
  const raw = useLocalSearchParams<{ restaurant?: string | string[]; slug?: string | string[] }>()
  const restaurantName =
    firstSegmentParam(raw.restaurant) || firstSegmentParam(raw.slug) || 'this restaurant'

  return (
    <SafeAreaView className="flex-1 bg-white px-10" edges={['left', 'right', 'bottom']}>
      <Text className="pt-36 text-center font-neusans text-3xl font-semibold" style={{ color: TEXT_HEADING }}>
        Review published
      </Text>
      <Text className="mt-8 text-center font-neusans text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
        Thanks for sharing your experience at{' '}
        <Text style={{ fontWeight: '700', color: TEXT_HEADING }}>{restaurantName}</Text>.
      </Text>

      <Pressable
        className="mt-14 self-center rounded-full px-14 py-4"
        style={{ backgroundColor: BRAND_PRIMARY }}
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.replace(SCREEN_HOME)
        }}
      >
        <Text className="font-neusans text-base font-semibold text-white">Back to Home</Text>
      </Pressable>

      <Pressable className="mt-10" onPress={() => router.replace(SCREEN_STUDIO_REVIEW_LISTING)}>
        <Text className="text-center font-neusans text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
          Manage all reviews
        </Text>
      </Pressable>
    </SafeAreaView>
  )
}
