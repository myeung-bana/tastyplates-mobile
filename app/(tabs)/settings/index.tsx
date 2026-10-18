import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSignOut } from '@nhost/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { ProfileMenuCard, ProfileMenuRow } from '@/components/profile/UnifiedProfileView'
import { TEXT_MUTED } from '@/constants/brand'
import { SCREEN_SETTINGS_ACCOUNT_SECURITY, SCREEN_SETTINGS_BLOCKED_USERS } from '@/constants/screens'
import { openLegalPage } from '@/lib/legalLinks'
import { confirmLogOut } from '@/lib/settingsActions'
import { SettingsLogoutButton } from '@/components/settings/SettingsLogoutButton'

const APP_VERSION = Constants.expoConfig?.version ?? ''

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
          <ProfileMenuRow
            icon="slash"
            title="Blocked Users"
            subtitle="People you have blocked"
            topBorder
            onPress={() => router.push(SCREEN_SETTINGS_BLOCKED_USERS)}
          />
        </ProfileMenuCard>

        <ProfileMenuCard>
          <ProfileMenuRow
            icon="lock"
            title="Privacy Policy"
            topBorder={false}
            onPress={() => void openLegalPage('privacy-policy')}
          />
          <ProfileMenuRow
            icon="file-text"
            title="Terms of Service"
            topBorder
            onPress={() => void openLegalPage('terms-of-service')}
          />
          <ProfileMenuRow
            icon="book-open"
            title="Content Guidelines"
            topBorder
            onPress={() => void openLegalPage('content-guidelines')}
          />
        </ProfileMenuCard>

        <SettingsLogoutButton
          signingOut={signingOut}
          onPress={() =>
            confirmLogOut({ router, signOut, onSigningOutChange: setSigningOut })
          }
        />

        {APP_VERSION ? (
          <Text className="mt-6 text-center text-xs font-neusans" style={{ color: TEXT_MUTED }}>
            TastyPlates v{APP_VERSION}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}
