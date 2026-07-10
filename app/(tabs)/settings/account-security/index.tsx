import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { ProfileMenuCard, ProfileMenuRow } from '@/components/profile/UnifiedProfileView'
import { SCREEN_SETTINGS_PASSWORD, SCREEN_SETTINGS_PROFILE } from '@/constants/screens'

export default function AccountSecurityScreen(): JSX.Element {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Account Security" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        <ProfileMenuCard>
          <ProfileMenuRow
            icon="user"
            title="Profile"
            subtitle="Email, birthdate, gender"
            topBorder={false}
            onPress={() => router.push(SCREEN_SETTINGS_PROFILE)}
          />
          <ProfileMenuRow
            icon="lock"
            title="Password"
            subtitle="Send a reset email"
            topBorder
            onPress={() => router.push(SCREEN_SETTINGS_PASSWORD)}
          />
        </ProfileMenuCard>
      </ScrollView>
    </View>
  )
}
