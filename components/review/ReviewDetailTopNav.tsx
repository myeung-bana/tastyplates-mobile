import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { TEXT_HEADING } from '@/constants/brand'
import { SCREEN_HOME } from '@/constants/screens'

export interface ReviewDetailTopNavProps {
  /** Center title (defaults to “Review”). */
  title?: string
}

/**
 * Thin top bar with back (`chevron-back`) — `auth-review.md` §3 single-page viewer.
 */
export function ReviewDetailTopNav({ title = 'Review' }: ReviewDetailTopNavProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const goBack = () => {
    void Haptics.selectionAsync()
    if (router.canGoBack()) router.back()
    else router.replace(SCREEN_HOME)
  }

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 bg-white"
    >
      <View className="flex-row items-center px-1 py-1.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={goBack}
          className="h-10 w-11 items-center justify-center active:opacity-70"
        >
          <AppIcon name="chevron-left" size={28} color={TEXT_HEADING} />
        </Pressable>
        <Text
          className="min-w-0 flex-1 text-center text-base font-semibold"
          style={{ color: TEXT_HEADING }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="w-11" />
      </View>
    </View>
  )
}
