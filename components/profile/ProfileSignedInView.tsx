import { useCallback, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useRouter } from 'expo-router'

import { ProfileRecentActivityPreview } from '@/components/profile/ProfileRecentActivityPreview'
import { UnifiedProfileView } from '@/components/profile/UnifiedProfileView'
import { readStringMeta } from '@/lib/profileMetaUtils'
import { formatMemberSince, initialsFromName, parseProfilePalates } from '@/lib/profileFormatting'
import { pushPublicProfile } from '@/lib/publicProfileNavigation'
import { useNhostSession } from '@/hooks/useNhostSession'
import { useOwnProfilePresentation } from '@/hooks/useOwnProfilePresentation'
import { useOwnProfileStats } from '@/hooks/useOwnProfileStats'
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy'
import { useProfileRecentActivity } from '@/hooks/useProfileRecentActivity'
import type { RestaurantUserRow } from '@/services/restaurantUserService'
import { formatProfileLocationCityCountry } from '@/utils/locationUtils'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_REVIEW_VIEWER,
  SCREEN_SETTINGS,
} from '@/constants/screens'

/** Session profile + merged `restaurant_users` row (username, `about_me`, palates JSON). */
export function ProfileSignedInView() {
  const router = useRouter()
  const { authUser, profile, loading: sessionLoading } = useNhostSession()
  const {
    authUserId: userId,
    avatarUrl,
    restaurantUser: ru,
    loading: ruLoading,
    refreshRestaurantUser,
  } = useOwnProfilePresentation()
  const statsApi = useOwnProfileStats(userId)
  const activityApi = useProfileRecentActivity(userId, 3, { withAuth: true })
  const { hierarchy } = useLocationHierarchy(Boolean(userId))
  const hierarchyCountries = hierarchy?.hierarchy.countries ?? null
  const [pullRefreshing, setPullRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    await Promise.all([statsApi.refresh(), refreshRestaurantUser(), activityApi.refresh()])
  }, [activityApi.refresh, statsApi.refresh, refreshRestaurantUser])

  useFocusEffect(
    useCallback(() => {
      void refreshRestaurantUser()
      void activityApi.refresh()
    }, [activityApi.refresh, refreshRestaurantUser]),
  )

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

  if (!userId) return null

  const openReview = (reviewId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: SCREEN_REVIEW_VIEWER,
      params: { reviewId },
    })
  }

  const meTabExtra = (
    <ProfileRecentActivityPreview
      loading={activityApi.loading}
      error={activityApi.error}
      activities={activityApi.activities}
      onPressReview={openReview}
      onPressComment={openReview}
      onPressAuthor={() => {}}
      emptyMessage="Your recent reviews, check-ins, and comments will appear here."
    />
  )

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
      currentLocationLabel={formatProfileLocationCityCountry(
        ru?.current_location,
        hierarchyCountries,
      )}
      hometownLabel={formatProfileLocationCityCountry(ru?.hometown, hierarchyCountries)}
      pullRefreshing={pullRefreshing}
      onRefresh={onPullRefresh}
      onPressAvatarOwn={() => router.push(SCREEN_EDIT_PROFILE)}
      onPressSettings={() => router.push(SCREEN_SETTINGS)}
      followButton={null}
      meTabExtra={meTabExtra}
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
