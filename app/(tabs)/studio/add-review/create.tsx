import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_LISTING_EXPLANATION,
  SCREEN_STUDIO_ADD_REVIEW,
  SCREEN_STUDIO_MY_LISTS,
} from '@/constants/screens'
import { firstSegmentParam } from '@/lib/routeParams'

/**
 * Fallback when autocomplete matches Places but TP `match-restaurant` returns zero rows.
 */
export default function StudioCreateRestaurantScreen(): JSX.Element {
  const params = useLocalSearchParams<{ placeId?: string | string[]; label?: string | string[] }>()
  const snippet = firstSegmentParam(params.label) || firstSegmentParam(params.placeId)

  return (
    <SafeAreaView className="flex-1 bg-white px-10" edges={['left', 'right', 'bottom']}>
      <Text className="pt-24 text-2xl font-semibold" style={{ color: TEXT_HEADING }}>
        Not on TP yet?
      </Text>
      <Text className="mt-6 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
        Anchor it in <Text style={{ fontWeight: '700', color: TEXT_HEADING }}>My Lists</Text> immediately, launch the
        curator listing wizard whenever Ops is ready.
        {snippet.length > 0 ? ` Venue hint: ${snippet}.` : ''}
      </Text>

      <Pressable
        className="mt-10 rounded-full px-14 py-4"
        style={{ backgroundColor: BRAND_PRIMARY }}
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          router.push(SCREEN_LISTING_EXPLANATION)
        }}
      >
        <Text className="text-center text-base font-semibold text-white">Start listing wizard</Text>
      </Pressable>

      <Pressable
        className="mt-6"
        onPress={() => router.push(SCREEN_STUDIO_MY_LISTS)}
      >
        <Text className="text-center font-semibold" style={{ color: TEXT_HEADING }}>
          Save Google place → My Lists
        </Text>
      </Pressable>

      <Pressable className="mt-8" onPress={() => router.replace(SCREEN_STUDIO_ADD_REVIEW)}>
        <Text className="text-center font-semibold" style={{ color: BRAND_PRIMARY }}>
          Back to search
        </Text>
      </Pressable>
    </SafeAreaView>
  )
}
