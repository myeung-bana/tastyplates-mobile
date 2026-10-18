import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_HOME, SCREEN_STUDIO_REVIEW_LISTING } from '@/constants/screens'
import { firstSegmentParam } from '@/lib/routeParams'
import { bodyFont } from '@/constants/typography'

export default function AddReviewSuccessScreen(): JSX.Element {
  const raw = useLocalSearchParams<{ restaurant?: string | string[]; slug?: string | string[] }>()
  const restaurantName =
    firstSegmentParam(raw.restaurant) || firstSegmentParam(raw.slug) || 'this restaurant'

  return (
    <SafeAreaView className="flex-1 bg-white px-10" edges={['left', 'right', 'bottom']}>
      <Text className="pt-36 text-center text-3xl font-heading" style={{ color: TEXT_HEADING }}>
        Review published
      </Text>
      <Text className="mt-8 text-center text-sm leading-relaxed font-body" style={{ color: TEXT_MUTED }}>
        Thanks for sharing your experience at{' '}
        <Text style={{ fontFamily: bodyFont('700'), color: TEXT_HEADING }}>{restaurantName}</Text>.
      </Text>

      <Pressable
        className="mt-14 self-center rounded-full px-14 py-4"
        style={{ backgroundColor: BRAND_PRIMARY }}
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.replace(SCREEN_HOME)
        }}
      >
        <Text className="text-base text-white font-body-semibold">Back to Home</Text>
      </Pressable>

      <Pressable className="mt-10" onPress={() => router.replace(SCREEN_STUDIO_REVIEW_LISTING)}>
        <Text className="text-center text-sm font-body-semibold" style={{ color: BRAND_PRIMARY }}>
          Manage all reviews
        </Text>
      </Pressable>
    </SafeAreaView>
  )
}
