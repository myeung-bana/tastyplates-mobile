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
        <AppIcon name="plus" size={28} color="#FF7C09" />
      </View>

      <View className="min-w-0 flex-1" style={{ gap: 2 }}>
        <Text className="text-[15px] text-[#31343F] font-body-medium" numberOfLines={1}>
          Add Restaurant
        </Text>
      </View>
      <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
    </Pressable>
  )
}
