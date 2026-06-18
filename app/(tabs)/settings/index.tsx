import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSignOut } from '@nhost/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { ProfileMenuCard, ProfileMenuRow } from '@/components/profile/UnifiedProfileView'
import { SCREEN_SETTINGS_ACCOUNT_SECURITY } from '@/constants/screens'
import { confirmLogOut } from '@/lib/settingsActions'
import { SettingsLogoutButton } from '@/components/settings/SettingsLogoutButton'

export default function SettingsScreen(): JSX.Element {
  const router = useRouter()
  const { signOut } = useSignOut()
  const insets = useSafeAreaInsets()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Settings" />
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
            icon="shield"
            title="Account Security"
            subtitle="Password and account details"
            topBorder={false}
            onPress={() => router.push(SCREEN_SETTINGS_ACCOUNT_SECURITY)}
          />
        </ProfileMenuCard>

        <SettingsLogoutButton
          signingOut={signingOut}
          onPress={() =>
            confirmLogOut({ router, signOut, onSigningOutChange: setSigningOut })
          }
        />
      </ScrollView>
    </View>
  )
}
