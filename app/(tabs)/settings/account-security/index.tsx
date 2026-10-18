import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { ProfileMenuCard, ProfileMenuRow } from '@/components/profile/UnifiedProfileView'
import { SCREEN_SETTINGS_DELETE_ACCOUNT, SCREEN_SETTINGS_PROFILE } from '@/constants/screens'

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
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        <ProfileMenuCard title="Profile">
          <ProfileMenuRow
            icon="user"
            title="Profile"
            subtitle="Email, birthdate and gender."
            onPress={() => router.push(SCREEN_SETTINGS_PROFILE)}
          />
        </ProfileMenuCard>
        <ProfileMenuCard title="Danger zone">
          <ProfileMenuRow
            icon="trash-2"
            title="Delete Account"
            subtitle="Hidden now, gone for good after 30 days."
            danger
            onPress={() => router.push(SCREEN_SETTINGS_DELETE_ACCOUNT)}
          />
        </ProfileMenuCard>
      </ScrollView>
    </View>
  )
}
