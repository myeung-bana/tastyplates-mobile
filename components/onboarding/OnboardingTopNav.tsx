import { View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CircleBackButton } from '@/components/navigation/CircleBackButton'
import { TEXT_HEADING } from '@/constants/brand'

export type OnboardingTopNavTitle = 'Choose Username' | 'Set Location' | 'Select Palate'

export type OnboardingTopNavProps = {
  title: OnboardingTopNavTitle
  /** When false, reserves space without showing back (step 1). */
  showBack?: boolean
  onBack?: () => void
}

export function OnboardingTopNav({
  title,
  showBack = true,
  onBack,
}: OnboardingTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 bg-white"
    >
      <View className="flex-row items-center px-4 py-2">
        {showBack ? <CircleBackButton onPress={onBack} /> : <View className="h-10 w-10" />}
        <Text
          className="min-w-0 flex-1 text-center text-[18px] font-semibold"
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
