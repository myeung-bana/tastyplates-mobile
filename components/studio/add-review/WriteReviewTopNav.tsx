import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CircleCloseButton } from '@/components/navigation/CircleCloseButton'
import { TEXT_HEADING } from '@/constants/brand'

export type WriteReviewTopNavProps = {
  title: string
  onClose: () => void
}

export function WriteReviewTopNav({ title, onClose }: WriteReviewTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 bg-white"
    >
      <View className="flex-row items-center px-4 py-2">
        <CircleCloseButton onPress={onClose} accessibilityLabel="Close and return home" />
        <Text
          className="min-w-0 flex-1 text-center text-base font-semibold"
          style={{ color: TEXT_HEADING }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="h-10 w-10" />
      </View>
    </View>
  )
}
