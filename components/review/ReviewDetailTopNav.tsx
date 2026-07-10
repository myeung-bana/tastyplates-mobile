import { View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CircleBackButton } from '@/components/navigation/CircleBackButton'
import { TEXT_HEADING } from '@/constants/brand'

export interface ReviewDetailTopNavProps {
  /** Center title (defaults to “Review”). */
  title?: string
  /** When false, hides the back button (e.g. success confirmation). */
  showBack?: boolean
}

/**
 * Thin top bar with circular back (`chevron-left`) — `auth-review.md` §3 single-page viewer.
 */
export function ReviewDetailTopNav({
  title = 'Review',
  showBack = true,
}: ReviewDetailTopNavProps): JSX.Element {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 bg-white"
    >
      <View className="flex-row items-center px-4 py-2">
        {showBack ? <CircleBackButton /> : <View className="h-10 w-10" />}
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
