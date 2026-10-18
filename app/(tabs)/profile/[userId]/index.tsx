import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { ProfileRecentActivityPreview } from '@/components/profile/ProfileRecentActivityPreview'
import { UnifiedProfileView } from '@/components/profile/UnifiedProfileView'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_HOME,
  SCREEN_PUBLIC_PROFILE,
  SCREEN_REVIEW_VIEWER,
  SCREEN_SETTINGS,
} from '@/constants/screens'
import { AUTH_WALL } from '@/constants/authWalls'
import { ProfilePhotoSheet } from '@/components/profile/ProfilePhotoSheet'
import { Button } from '@/components/ui/Button'
import { FONT } from '@/constants/typography'
import { useProfilePhotoChange } from '@/hooks/useProfilePhotoChange'
import { pushLoginScreen } from '@/lib/authRoutes'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { useModeration } from '@/contexts/ModerationContext'
import { useFollowTarget } from '@/hooks/useFollowTarget'
import { useAuth } from '@/hooks/useAuth'
import { useLocationHierarchy } from '@/hooks/useLocationHierarchy'
import { useProfileRecentActivity } from '@/hooks/useProfileRecentActivity'
import { useUserData } from '@nhost/react'
import {
  formatMemberSince,
  initialsFromName,
  parseProfilePalates,
} from '@/lib/profileFormatting'
import { publicProfileFromAuthorFields, pushPublicProfile } from '@/lib/publicProfileNavigation'
import {
  fetchRestaurantUserById,
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
  normalizeLegacyProfileAvatar,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'
import { fetchIsUserBlocked, unblockUser } from '@/services/moderationService'
import { fetchPublicProfileCounts } from '@/services/profileStatsService'
import { toast } from '@/utils/toast'
import { formatProfileLocationCityCountry } from '@/utils/locationUtils'

/**
 * `[userId]` is either `auth`/profile UUID (Hasura user id, legacy `RestaurantUserRow.id`)
 * **or** a public username slug; usernames resolve via `get-restaurant-user-by-username`.
 */
export default function PublicProfileIndexScreen() {
  const router = useRouter()
  const raw = useLocalSearchParams<{ userId: string | string[] }>()
  const userIdRaw = typeof raw.userId === 'string' ? raw.userId : raw.userId?.[0]
  const slug = userIdRaw?.trim().replace(/^@/, '') ?? ''

  const authViewer = useUserData()
  const { isAuthenticated } = useAuth()
  const viewerId = authViewer?.id

  const [ru, setRu] = useState<RestaurantUserRow | null>(null)
  const [counts, setCounts] = useState({
    reviews: null as number | null,
    followers: null as number | null,
    following: null as number | null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isOwnProfile = Boolean(viewerId && ru?.id && viewerId === ru.id)
  const activityApi = useProfileRecentActivity(ru?.id, 3, { withAuth: isOwnProfile })
  const { hierarchy } = useLocationHierarchy(Boolean(ru?.id))
  const hierarchyCountries = hierarchy?.hierarchy.countries ?? null

  const loadProfile = useCallback(async () => {
    if (!slug) {
      setError('Invalid profile.')
      setLoading(false)
      return
    }

    const byUuid = isRestaurantUserRouteId(slug)

    setError(null)
    setLoading(true)
    try {
      const user = byUuid
        ? await fetchRestaurantUserById(slug)
        : await fetchRestaurantUserByUsername(slug)
      setRu(user)
      const next = await fetchPublicProfileCounts(user.id)
      setCounts({
        reviews: next.reviews,
        followers: next.followers,
        following: next.following,
      })
    } catch {
      setRu(null)
      setError('We could not find this profile.')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const followDisabled =
    !isAuthenticated || !ru?.id || !viewerId || viewerId === ru.id

  const follow = useFollowTarget(ru?.id, viewerId ?? undefined, followDisabled)

  const { openContentActions, openReport } = useModeration()
  const { openAuthSheet } = useAuthSheet()
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !ru?.id || isOwnProfile) {
      setBlocked(false)
      return
    }
    let cancelled = false
    void fetchIsUserBlocked(ru.id)
      .then((value) => {
        if (!cancelled) setBlocked(value)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isOwnProfile, ru?.id])

  const handleUnblock = useCallback(
    (userId: string, label: string) => {
      Alert.alert(`Unblock ${label}?`, 'They will be able to see and interact with you again.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void unblockUser(userId)
              .then(() => {
                setBlocked(false)
                toast.success(`${label} has been unblocked.`)
                void activityApi.refresh()
              })
              .catch(() => toast.error('Could not unblock this user. Please try again.'))
          },
        },
      ])
    },
    [activityApi],
  )

  const [pullRefreshing, setPullRefreshing] = useState(false)
  const photo = useProfilePhotoChange(isOwnProfile ? viewerId : null, () => void loadProfile())

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true)
    try {
      await Promise.all([loadProfile(), activityApi.refresh()])
    } finally {
      setPullRefreshing(false)
    }
  }, [activityApi.refresh, loadProfile])

  if (!slug) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ color: TEXT_MUTED }}>Invalid profile link.</Text>
        </View>
      </View>
    )
  }

  if (loading || (!ru && !error)) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <View className="flex-1 items-center justify-center bg-white py-20">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      </View>
    )
  }

  if (error || !ru) {
    return (
      <View className="flex-1 bg-white">
        <AppTopNav />
        <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: 32, gap: 10 }}>
          <Text accessibilityRole="header" className="text-center" style={{ fontFamily: FONT.heading, fontSize: 24, color: TEXT_HEADING }}>
            Profile not found
          </Text>
          <Text className="text-center" style={{ fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: TEXT_MUTED }}>
            This account may have changed its username or no longer exists.
          </Text>
          <Button style={{ marginTop: 10, alignSelf: 'stretch' }} onPress={() => router.replace(SCREEN_HOME)}>
            Back to Home
          </Button>
        </View>
      </View>
    )
  }

  const slugRoute = ru.username?.trim().replace(/^@/, '') ?? ''
  const headlineHandle =
    slugRoute.length > 0
      ? `@${slugRoute}`
      : ru.display_name?.trim()?.length
        ? ru.display_name.trim()
        : 'Member'

  const displayName =
    ru.display_name?.trim() || ru.username?.trim() || (slugRoute ? `@${slugRoute}` : headlineHandle) || 'Food lover'

  const avatarUrl = normalizeLegacyProfileAvatar(ru.avatarUrl, ru.profile_image)

  const palatesMerged = parseProfilePalates(ru.palates)
  const memberSinceLabel = ru.created_at ? formatMemberSince(ru.created_at) : ''
  const bio = ru.about_me?.trim()?.length ? ru.about_me.trim() : null
  const currentLocationLabel = formatProfileLocationCityCountry(
    ru.current_location,
    hierarchyCountries,
  )
  const hometownLabel = formatProfileLocationCityCountry(ru.hometown, hierarchyCountries)

  const onPressMore = isOwnProfile
    ? undefined
    : () => {
        if (!isAuthenticated) {
          openAuthSheet()
          return
        }
        if (!blocked) {
          openContentActions({
            targetType: 'user',
            targetId: ru.id,
            ownerId: ru.id,
            ownerLabel: headlineHandle,
            onBlocked: () => {
              setBlocked(true)
              void activityApi.refresh()
            },
          })
          return
        }
        Alert.alert('Options', undefined, [
          {
            text: 'Report profile',
            onPress: () => openReport({ targetType: 'user', targetId: ru.id }),
          },
          { text: `Unblock ${headlineHandle}`, onPress: () => handleUnblock(ru.id, headlineHandle) },
          { text: 'Cancel', style: 'cancel' },
        ])
      }

  const followUi =
    isAuthenticated && !isOwnProfile && !blocked
      ? {
          isFollowing: follow.following,
          loading: follow.loading,
          onToggle: follow.toggleFollowing,
        }
      : null

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
      onPressAuthor={(authorId, profile) => {
        void Haptics.selectionAsync()
        pushPublicProfile(router, publicProfileFromAuthorFields(authorId, profile))
      }}
      emptyMessage="Recent activity from this account will appear here."
    />
  )

  return (
    <View className="flex-1 bg-white">
      <UnifiedProfileView
        isOwnProfile={isOwnProfile}
        routeUserId={ru.id}
        headlineHandle={headlineHandle}
        avatarUrl={avatarUrl}
        initials={initialsFromName(displayName)}
        displayNameSubtitle={displayName.startsWith('@') ? null : displayName}
        bio={bio}
        palates={palatesMerged}
        memberSinceLabel={memberSinceLabel}
        stats={{
          posts: counts.reviews,
          followers: counts.followers,
          following: counts.following,
        }}
        statsLoading={false}
        currentLocationLabel={currentLocationLabel}
        hometownLabel={hometownLabel}
        pullRefreshing={pullRefreshing}
        onRefresh={onPullRefresh}
        onPressAvatarOwn={isOwnProfile ? photo.openSheet : undefined}
        avatarUploading={photo.uploading}
        avatarPendingUri={photo.pendingUri}
        onPressSettings={isOwnProfile ? () => router.push(SCREEN_SETTINGS) : undefined}
        followButton={followUi}
        showFollowPlaceholder={!isAuthenticated && !isOwnProfile}
        onPressFollowPlaceholder={() =>
          pushLoginScreen(router, {
            resume: { pathname: SCREEN_PUBLIC_PROFILE, params: { userId: ru.id } },
            wall: AUTH_WALL.follow,
          })
        }
        onPressMore={onPressMore}
        meTabExtra={meTabExtra}
        blockedHandle={blocked ? headlineHandle : null}
      />
      {isOwnProfile ? (
        <ProfilePhotoSheet
          visible={photo.sheetOpen}
          avatarUrl={avatarUrl}
          hasCustomPhoto={Boolean(avatarUrl)}
          onTakePhoto={photo.takePhoto}
          onChooseLibrary={photo.chooseLibrary}
          onRemove={photo.removePhoto}
          onClose={photo.closeSheet}
        />
      ) : null}
    </View>
  )
}
