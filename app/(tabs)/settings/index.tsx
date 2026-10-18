import { useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSignOut } from '@nhost/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'

import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { ProfileMenuCard, ProfileMenuRow } from '@/components/profile/UnifiedProfileView'
import { SettingsLogoutButton } from '@/components/settings/SettingsLogoutButton'
import { SURFACE_CARD, TEXT_TERTIARY } from '@/constants/brand'
import {
  SCREEN_SETTINGS_ACCOUNT_SECURITY,
  SCREEN_SETTINGS_BLOCKED_USERS,
  SCREEN_SETTINGS_LANGUAGE,
  SCREEN_SETTINGS_PASSWORD,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { openLegalPage } from '@/lib/legalLinks'
import { confirmLogOut } from '@/lib/settingsActions'
import { fetchBlockedUsers } from '@/services/moderationService'

const APP_VERSION = Constants.expoConfig?.version ?? ''
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ?? String(Constants.expoConfig?.android?.versionCode ?? '')

/** `/settings` (design T1). Version sits under Log out. */
export default function SettingsScreen(): JSX.Element {
  const router = useRouter()
  const { signOut } = useSignOut()
  const insets = useSafeAreaInsets()
  const [signingOut, setSigningOut] = useState(false)
  const [blockedCount, setBlockedCount] = useState<number | null>(null)

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      void fetchBlockedUsers()
        .then((rows) => {
          if (!cancelled) setBlockedCount(rows.length)
        })
        .catch(() => undefined)
      return () => {
        cancelled = true
      }
    }, []),
  )

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_CARD }}>
      <ReviewDetailTopNav title="Settings" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        <ProfileMenuCard title="Account">
          <ProfileMenuRow
            icon="shield"
            title="Account Security"
            subtitle="Profile details and account deletion."
            onPress={() => router.push(SCREEN_SETTINGS_ACCOUNT_SECURITY)}
          />
          <ProfileMenuRow
            icon="lock"
            title="Password"
            subtitle="Send a reset email."
            topBorder
            onPress={() => router.push(SCREEN_SETTINGS_PASSWORD)}
          />
        </ProfileMenuCard>

        <ProfileMenuCard title="Privacy">
          <ProfileMenuRow
            icon="slash"
            title="Blocked Users"
            value={blockedCount ? String(blockedCount) : undefined}
            onPress={() => router.push(SCREEN_SETTINGS_BLOCKED_USERS)}
          />
        </ProfileMenuCard>

        <ProfileMenuCard title="General">
          <ProfileMenuRow
            icon="globe"
            title="Language"
            value="English"
            onPress={() => router.push(SCREEN_SETTINGS_LANGUAGE)}
          />
        </ProfileMenuCard>

        <ProfileMenuCard title="Legal">
          <ProfileMenuRow icon="lock" title="Privacy Policy" onPress={() => void openLegalPage('privacy-policy')} />
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

        <View style={{ marginTop: 28 }}>
          <SettingsLogoutButton
            signingOut={signingOut}
            onPress={() => confirmLogOut({ router, signOut, onSigningOutChange: setSigningOut })}
          />
        </View>

        {APP_VERSION ? (
          <Text className="text-center" style={{ marginTop: 16, fontFamily: FONT.body, fontSize: 12, color: TEXT_TERTIARY }}>
            Version {APP_VERSION}
            {BUILD_NUMBER ? ` (${BUILD_NUMBER})` : ''}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}
