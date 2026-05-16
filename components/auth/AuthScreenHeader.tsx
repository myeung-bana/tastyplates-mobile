import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

import { SCREEN_HOME } from '@/constants/screens'

type AuthScreenHeaderProps = {
  /** Optional title on the left (e.g. "Log in"). */
  title?: string
}

/**
 * Auth stack header: optional title on the left, home / close control on the right.
 */
export function AuthScreenHeader({ title }: AuthScreenHeaderProps) {
  const router = useRouter()

  const goHome = () => {
    router.replace(SCREEN_HOME)
  }

  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 bg-[#FCFCFC] px-4 pb-3 pt-2">
      {title ? (
        <Text
          className="text-lg font-semibold"
          style={{ color: TEXT_HEADING }}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}
      <Pressable
        accessibilityLabel="Back to home"
        accessibilityRole="button"
        hitSlop={12}
        onPress={goHome}
        className="rounded-lg p-2 active:opacity-70"
      >
        <Ionicons name="home-outline" size={26} color={BRAND_PRIMARY} />
      </Pressable>
    </View>
  )
}
