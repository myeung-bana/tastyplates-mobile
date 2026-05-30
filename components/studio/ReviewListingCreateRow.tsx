import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_STUDIO_ADD_REVIEW } from '@/constants/screens'

/** First row on Manage Reviews — same card layout as review rows, opens create flow. */
export function ReviewListingCreateRow(): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create Review"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.push(SCREEN_STUDIO_ADD_REVIEW)
      }}
      className="mb-3 rounded-3xl border bg-white px-4 py-4 active:bg-gray-50"
      style={{ borderColor: BORDER_SUBTLE }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#fff8f3' }}
        >
          <AppIcon name="plus" size={22} color={BRAND_PRIMARY} />
        </View>
        <AppIcon name="chevron-right" size={16} color={TEXT_MUTED} />
      </View>
      <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
        Create Review
      </Text>
      <Text className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_BODY }} numberOfLines={2}>
        Search for a restaurant and share your experience
      </Text>
    </Pressable>
  )
}
