import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { palateLimit } from '@/constants/validation'

export interface ChoosePalatesTopNavProps {
  selectedCount: number
  onCancel: () => void
}

export function ChoosePalatesTopNav({
  selectedCount,
  onCancel,
}: ChoosePalatesTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()
  const complete = selectedCount >= palateLimit

  const handleCancel = () => {
    void Haptics.selectionAsync()
    onCancel()
  }

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 bg-white"
    >
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          onPress={handleCancel}
          className="min-w-[72px] py-2 active:opacity-70"
        >
          <Text className="text-base" style={{ color: TEXT_MUTED }}>
            Cancel
          </Text>
        </Pressable>

        <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }}>
          Choose palates
        </Text>

        <View className="min-w-[72px] items-end py-2">
          <Text
            className="text-base font-semibold"
            style={{ color: complete ? BRAND_PRIMARY : TEXT_MUTED }}
          >
            {selectedCount}/{palateLimit}
          </Text>
        </View>
      </View>
    </View>
  )
}
