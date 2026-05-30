import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

export interface ManageListAddRestaurantRowProps {
  onPress: () => void
}

/** List-detail row — same layout as {@link ManageListItemRow}, opens add-restaurant flow. */
export function ManageListAddRestaurantRow({ onPress }: ManageListAddRestaurantRowProps): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add Restaurant"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      className="flex-row items-center gap-3 border-b border-gray-50 bg-white px-4 py-3 active:bg-gray-50"
    >
      <View className="h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50">
        <AppIcon name="plus" size={28} color="#ff7c0a" />
      </View>

      <View className="min-w-0 flex-1" style={{ gap: 2 }}>
        <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
          Add Restaurant
        </Text>
        <Text className="font-neusans text-[13px] text-[#6b7280]" numberOfLines={1}>
          Search or pick a place nearby
        </Text>
      </View>

      <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
    </Pressable>
  )
}
