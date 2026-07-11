import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY } from '@/constants/brand'

type Props = {
  label: string
  slug: string
  onPress: () => void
}

export function CategorySearchShortcutRow({ label, onPress }: Props): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${label} restaurants by category`}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="mx-4 mb-1 flex-row items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-3 active:opacity-90"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
        <AppIcon name="tag" size={20} color={BRAND_PRIMARY} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-neusans text-[15px] font-semibold text-[#31343F]" numberOfLines={1}>
          {label}
        </Text>
        <Text className="mt-0.5 font-neusans text-xs text-gray-500">Search by category</Text>
      </View>
      <AppIcon name="chevron-right" size={18} color="#9ca3af" />
    </Pressable>
  )
}
