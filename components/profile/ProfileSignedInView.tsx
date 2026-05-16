import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'

import {
  ProfileMenuCard,
  ProfileMenuRow,
  UnifiedProfileView,
} from '@/components/profile/UnifiedProfileView'
import { readStringMeta } from '@/lib/profileMetaUtils'
import { formatMemberSince, initialsFromName, parseProfilePalates } from '@/lib/profileFormatting'
import { useNhostSession } from '@/hooks/useNhostSession'
import { useOwnProfileStats } from '@/hooks/useOwnProfileStats'
import { fetchRestaurantUserById, normalizeLegacyProfileAvatar, type RestaurantUserRow } from '@/services/restaurantUserService'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_FOLLOWING,
  SCREEN_SETTINGS,
  SCREEN_STUDIO_REVIEW_LISTING,
} from '@/constants/screens'

/** Session profile + merged `restaurant_users` row (username, `about_me`, palates JSON). */
export function ProfileSignedInView() {
  const router = useRouter()
  const { authUser, profile, loading: sessionLoading } = useNhostSession()
  const userId = authUser?.id
  const statsApi = useOwnProfileStats(userId)
  const [ru, setRu] = useState<RestaurantUserRow | null>(null)
  const [ruLoading, setRuLoading] = useState(true)
  const [pullRefreshing, setPullRefreshing] = useState(false)

  useEffect(() => {
    if (!userId) {
      setRu(null)
      setRuLoading(false)
      return
    }
    let cancelled = false
    setRuLoading(true)
    void (async () => {
      try {
        const row = await fetchRestaurantUserById(userId)
        if (!cancelled) setRu(row)
      } catch {
        if (!cancelled) setRu(null)
      } finally {
        if (!cancelled) setRuLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const refreshAll = useCallback(async () => {
    await statsApi.refresh()
    if (!userId) return
    try {
      const row = await fetchRestaurantUserById(userId)
      setRu(row)
    } catch {
      /* keep previous */
    }
  }, [statsApi.refresh, userId])

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

  const avatarUrl =
    profile?.avatarUrl?.trim() ||
    normalizeLegacyProfileAvatar(ru?.avatarUrl, ru?.profile_image)

  const memberSinceLabel = ru?.created_at ? formatMemberSince(ru.created_at) : ''

  const statsLoading =
    ruLoading ||
    sessionLoading ||
    (statsApi.loading &&
      statsApi.followers === null &&
      statsApi.following === null &&
      statsApi.reviews === null)

  const belowMenu = (
    <ProfileMenuCard>
      <ProfileMenuRow
        icon="settings-outline"
        title="Settings"
        subtitle="Account and app preferences"
        topBorder={false}
        onPress={() => router.push(SCREEN_SETTINGS)}
      />
      <ProfileMenuRow
        icon="list-outline"
        title="My reviews"
        subtitle="Published and drafts in TastyStudio"
        topBorder
        onPress={() => router.push(SCREEN_STUDIO_REVIEW_LISTING)}
      />
      <ProfileMenuRow
        icon="people-outline"
        title="Following feed"
        subtitle="Reviews from people you follow"
        topBorder
        onPress={() => router.push(SCREEN_FOLLOWING)}
      />
    </ProfileMenuCard>
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
