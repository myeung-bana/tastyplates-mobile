import { Pressable, Text, View } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { SCREEN_STUDIO_MANAGE_LISTS_CREATE } from '@/constants/screens'
import { castHref } from '@/lib/routeParams'

/** First row on Manage Lists — same layout as {@link ManageListRow}, opens create flow. */
export function ManageListCreateRow(): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create Restaurant List"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.push(castHref(SCREEN_STUDIO_MANAGE_LISTS_CREATE))
      }}
      className="flex-row items-center gap-3 border-b border-gray-50 bg-white px-4 py-3 active:bg-gray-50"
    >
      <View className="h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50">
        <Ionicons name="add" size={28} color="#ff7c0a" />
      </View>

      <View className="min-w-0 flex-1" style={{ gap: 2 }}>
        <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
          Create Restaurant List
        </Text>
        <Text className="font-neusans text-[13px] text-[#6b7280]" numberOfLines={1}>
          Name your list and add places
        </Text>
      </View>

      <Feather name="chevron-right" size={14} color="#e5e7eb" />
    </Pressable>
  )
}
