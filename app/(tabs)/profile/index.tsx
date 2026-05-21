import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ProfileSignedInView } from '@/components/profile/ProfileSignedInView'
import { useAuth } from '@/hooks/useAuth'
import { AppTopNav } from '@/components/layout/AppTopNav'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PROFILE } from '@/constants/screens'
import { pushLoginScreen } from '@/lib/authRoutes'

export default function ProfileScreen() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  if (!loading && !isAuthenticated) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-xl font-normal" style={{ color: TEXT_HEADING }}>
            Profile
          </Text>
          <Text
            className="mt-3 text-center text-sm leading-relaxed"
            style={{ color: TEXT_MUTED }}
          >
            Sign in to see your profile, wishlist, and check-ins.
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync()
              pushLoginScreen(router, { resume: SCREEN_PROFILE })
            }}
            className="mt-6 rounded-full px-8 py-3 active:opacity-90"
            style={{ backgroundColor: BRAND_PRIMARY }}
          >
            <Text className="font-normal text-base text-white">Sign in</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (isAuthenticated) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <ProfileSignedInView />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <AppTopNav />
      <View className="flex-1" />
    </View>
  )
}
