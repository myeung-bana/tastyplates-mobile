import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { BRAND_PRIMARY, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { useAuth } from '@/hooks/useAuth'
import { pushLoginScreen } from '@/lib/authRoutes'

/**
 * Following feed — gated like home "For You"; auth via `/login` + resume (`auth-review.md` §4–5).
 */
export default function FollowingScreen() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  if (!loading && !isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <AppTopNav />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-xl font-normal" style={{ color: TEXT_HEADING }}>
            Following
          </Text>
          <Text
            className="mt-3 text-center text-sm leading-relaxed"
            style={{ color: TEXT_MUTED }}
          >
            Sign in to see the latest reviews from people you follow.
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              pushLoginScreen(router, { resume: '/(tabs)/following' })
            }}
            className="mt-6 rounded-full px-8 py-3 active:opacity-90"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Text className="font-normal text-base text-white">Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <AppTopNav />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-normal" style={{ color: TEXT_HEADING }}>
          Following
        </Text>
        <Text className="mt-2 text-center text-sm leading-relaxed" style={{ color: TEXT_BODY }}>
          Following feed coming soon
        </Text>
      </View>
    </SafeAreaView>
  )
}
