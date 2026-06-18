import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useSignOut } from '@nhost/react'

import {
  ProfileMenuCard,
  ProfileMenuRow,
  UnifiedProfileView,
} from '@/components/profile/UnifiedProfileView'
import { readStringMeta } from '@/lib/profileMetaUtils'
import { formatMemberSince, initialsFromName, parseProfilePalates } from '@/lib/profileFormatting'
import { useNhostSession } from '@/hooks/useNhostSession'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import { useOwnProfileStats } from '@/hooks/useOwnProfileStats'
import type { RestaurantUserRow } from '@/services/restaurantUserService'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_FOLLOWING,
  SCREEN_GET_STARTED,
  SCREEN_SETTINGS,
  SCREEN_STUDIO_REVIEW_LISTING,
} from '@/constants/screens'
import { resetToGetStartedLanding } from '@/lib/guestBrowse'

/** Session profile + merged `restaurant_users` row (username, `about_me`, palates JSON). */
export function ProfileSignedInView() {
  const router = useRouter()
  const { signOut } = useSignOut()
  const [signingOut, setSigningOut] = useState(false)
  const { authUser, profile, loading: sessionLoading } = useNhostSession()
  const {
    authUserId: userId,
    avatarUrl,
    restaurantUser: ru,
    loading: ruLoading,
    refreshRestaurantUser,
  } = useOwnProfilePresentation()
  const statsApi = useOwnProfileStats(userId)
  const [pullRefreshing, setPullRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    await Promise.all([statsApi.refresh(), refreshRestaurantUser()])
  }, [statsApi.refresh, refreshRestaurantUser])

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true)
    try {
      await refreshAll()
    } finally {
      setPullRefreshing(false)
    }
  }, [refreshAll])

  const metadata =
    profile?.metadata && typeof profile.metadata === 'object'
      ? (profile.metadata as Record<string, unknown>)
      : null
  const bioNhost = readStringMeta(metadata, 'bio')
  const bio =
    (bioNhost?.trim()?.length ?? 0) > 0
      ? bioNhost
      : ru?.about_me?.trim()?.length
        ? ru.about_me.trim()
        : null
  const displayName =
    profile?.displayName?.trim() ||
    ru?.display_name?.trim() ||
    authUser?.displayName?.trim() ||
    'Food lover'

  const palatesMerged =
    parseProfilePalates(ru?.palates).length > 0
      ? parseProfilePalates(ru?.palates)
      : parseProfilePalates(metadata?.palates)

  const slug = routeSlug(ru, authUser?.email ?? undefined)

  const memberSinceLabel = ru?.created_at ? formatMemberSince(ru.created_at) : ''

  const statsLoading =
    ruLoading ||
    sessionLoading ||
    (statsApi.loading &&
      statsApi.followers === null &&
      statsApi.following === null &&
      statsApi.reviews === null)

  const confirmLogOut = useCallback(() => {
    void Haptics.selectionAsync()
    Alert.alert(
      'Log out?',
      'You will need to sign in again to access your profile and saved data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSigningOut(true)
              try {
                await resetToGetStartedLanding()
                router.replace(SCREEN_GET_STARTED)
                await signOut()
              } finally {
                setSigningOut(false)
              }
            })()
          },
        },
      ],
    )
  }, [router, signOut])

  const belowMenu = (
    <View>
      <ProfileMenuCard>
        <ProfileMenuRow
          icon="settings"
          title="Settings"
          subtitle="Account and app preferences"
          topBorder={false}
          onPress={() => router.push(SCREEN_SETTINGS)}
        />
        <ProfileMenuRow
          icon="list"
          title="My reviews"
          subtitle="Published and drafts in TastyStudio"
          topBorder
          onPress={() => router.push(SCREEN_STUDIO_REVIEW_LISTING)}
        />
        <ProfileMenuRow
          icon="users"
          title="Following feed"
          subtitle="Reviews from people you follow"
          topBorder
          onPress={() => router.push(SCREEN_FOLLOWING)}
        />
      </ProfileMenuCard>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        accessibilityHint="Signs you out of your account"
        disabled={signingOut}
        onPress={confirmLogOut}
        className="mt-4 items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 active:bg-gray-50"
        style={signingOut ? { opacity: 0.6 } : undefined}
      >
        {signingOut ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <Text className="text-base font-medium text-red-600">Log out</Text>
        )}
      </Pressable>
    </View>
  )

  if (!userId) return null

  return (
    <UnifiedProfileView
      isOwnProfile
      routeUserId={userId}
      headlineHandle={`@${slug}`}
      avatarUrl={avatarUrl}
      initials={initialsFromName(displayName)}
      displayNameSubtitle={displayName}
      bio={bio}
      palates={palatesMerged}
      memberSinceLabel={memberSinceLabel}
      stats={{
        posts: statsApi.reviews,
        followers: statsApi.followers,
        following: statsApi.following,
      }}
      statsLoading={statsLoading}
      pullRefreshing={pullRefreshing}
      onRefresh={onPullRefresh}
      onPressAvatarOwn={() => router.push(SCREEN_EDIT_PROFILE)}
      followButton={null}
      belowActions={belowMenu}
    />
  )
}

function routeSlug(ru: RestaurantUserRow | null, emailFallback?: string): string {
  const u = ru?.username?.trim().replace(/^@/, '')
  if (u) return u
  if (emailFallback?.includes('@')) {
    return emailFallback.split('@')[0]!.replace(/[^\w.-]+/g, '_') || 'member'
  }
  return 'member'
}
