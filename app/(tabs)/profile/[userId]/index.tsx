import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { AppTopNav } from '@/components/layout/AppTopNav'
import { UnifiedProfileView } from '@/components/profile/UnifiedProfileView'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import {
  SCREEN_EDIT_PROFILE,
  SCREEN_PUBLIC_PROFILE_REVIEWS,
  SCREEN_REVIEW_VIEWER,
} from '@/constants/screens'
import { useFollowTarget } from '@/hooks/useFollowTarget'
import { useAuth } from '@/hooks/useAuth'
import { useUserData } from '@nhost/react'
import {
  formatMemberSince,
  initialsFromName,
  parseProfilePalates,
} from '@/lib/profileFormatting'
import {
  fetchRestaurantUserById,
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
  normalizeLegacyProfileAvatar,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import { fetchUserReviews } from '@/services/profileUserReviewsService'
import { fetchPublicProfileCounts } from '@/services/profileStatsService'

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
  /** Published-review preview only when browsing someone else (`get-user-reviews` public Approved). */
  const [visitorReviewRows, setVisitorReviewRows] = useState<TrendingReviewRow[]>([])
  const [visitorReviewsTotal, setVisitorReviewsTotal] = useState(0)
  const [visitorReviewsError, setVisitorReviewsError] = useState<string | null>(null)

  const isOwnProfile = Boolean(viewerId && ru?.id && viewerId === ru.id)

  const loadProfile = useCallback(async () => {
    if (!slug) {
      setError('Invalid profile.')
      setLoading(false)
      return
    }

    const byUuid = isRestaurantUserRouteId(slug)

    setError(null)
    setVisitorReviewsError(null)
    setLoading(true)
    try {
      const user = byUuid
        ? await fetchRestaurantUserById(slug)
        : await fetchRestaurantUserByUsername(slug)
      const isSelf = Boolean(viewerId && viewerId === user.id)
      setRu(user)
      const next = await fetchPublicProfileCounts(user.id)
      setCounts({
        reviews: next.reviews,
        followers: next.followers,
        following: next.following,
      })
      if (!isSelf) {
        try {
          const pv = await fetchUserReviews(user.id, { limit: 2, offset: 0 })
          setVisitorReviewRows(pv.reviews)
          setVisitorReviewsTotal(pv.meta.total)
          setVisitorReviewsError(null)
        } catch {
          setVisitorReviewRows([])
          setVisitorReviewsTotal(0)
          setVisitorReviewsError('Could not load reviews.')
        }
      } else {
        setVisitorReviewRows([])
        setVisitorReviewsTotal(0)
        setVisitorReviewsError(null)
      }
    } catch {
      setRu(null)
      setVisitorReviewRows([])
      setVisitorReviewsTotal(0)
      setError('We could not find this profile.')
    } finally {
      setLoading(false)
    }
  }, [slug, viewerId])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const followDisabled =
    !isAuthenticated || !ru?.id || !viewerId || viewerId === ru.id

  const follow = useFollowTarget(ru?.id, viewerId ?? undefined, followDisabled)

  const [pullRefreshing, setPullRefreshing] = useState(false)

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true)
    try {
      await loadProfile()
    } finally {
      setPullRefreshing(false)
    }
  }, [loadProfile])

  if (!slug) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <AppTopNav />
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ color: TEXT_MUTED }}>Invalid profile link.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (loading || (!ru && !error)) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <AppTopNav />
        <View className="flex-1 items-center justify-center bg-white py-20">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !ru) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <AppTopNav />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg" style={{ color: TEXT_HEADING }}>
            Profile not found
          </Text>
          <Text className="mt-2 text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            {error ?? ''}
          </Text>
        </View>
      </SafeAreaView>
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

  const followUi =
    isAuthenticated && !isOwnProfile
      ? {
          isFollowing: follow.following,
          loading: follow.loading,
          onToggle: follow.toggleFollowing,
        }
      : null

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <AppTopNav />
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
        pullRefreshing={pullRefreshing}
        onRefresh={onPullRefresh}
        onPressAvatarOwn={
          isOwnProfile ? () => router.push(SCREEN_EDIT_PROFILE) : undefined
        }
        followButton={followUi}
        showFollowPlaceholder={!isAuthenticated && !isOwnProfile}
        otherUserReviews={
          !isOwnProfile
            ? {
                error: visitorReviewsError,
                reviews: visitorReviewRows,
                total: visitorReviewsTotal,
                onPressReview: (reviewId) =>
                  router.push({
                    pathname: SCREEN_REVIEW_VIEWER,
                    params: { reviewId },
                  }),
                onPressViewAll: () =>
                  router.push({
                    pathname: SCREEN_PUBLIC_PROFILE_REVIEWS,
                    params: { userId: slug },
                  }),
              }
            : null
        }
        belowActions={null}
      />
    </SafeAreaView>
  )
}
