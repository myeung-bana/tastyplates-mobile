import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useUserData } from '@nhost/react'

import { FollowListUserRow } from '@/components/profile/FollowListUserRow'
import {
  ProfileConnectionsTabBar,
  type ProfileConnectionsTab,
} from '@/components/profile/ProfileConnectionsTabBar'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { SCREEN_PUBLIC_PROFILE_CONNECTIONS } from '@/constants/screens'
import { firstSegmentParam } from '@/lib/routeParams'
import {
  fetchFollowersList,
  fetchFollowingList,
  fetchViewerFollowingIds,
  type FollowListEntry,
} from '@/services/followListService'
import {
  followRestaurantUser,
  unfollowRestaurantUser,
} from '@/services/followUserService'
import {
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
} from '@/services/restaurantUserService'

const ROW_SEPARATOR = () => (
  <View style={{ height: 1, backgroundColor: '#e5e7eb', marginHorizontal: 20 }} />
)

function parseInitialTab(raw: string | undefined): ProfileConnectionsTab {
  return raw === 'following' ? 'following' : 'followers'
}

type ProfileConnectionsScreenProps = {
  /** When set, overrides the `tab` search param (legacy followers/following routes). */
  initialTab?: ProfileConnectionsTab
}

export function ProfileConnectionsScreen({
  initialTab: initialTabProp,
}: ProfileConnectionsScreenProps): JSX.Element {
  const router = useRouter()
  const raw = useLocalSearchParams<{ userId: string | string[]; tab?: string | string[] }>()
  const slug = useMemo(() => firstSegmentParam(raw.userId).trim().replace(/^@/, ''), [raw.userId])
  const tabParam = firstSegmentParam(raw.tab)
  const [activeTab, setActiveTab] = useState<ProfileConnectionsTab>(
    initialTabProp ?? parseInitialTab(tabParam),
  )

  const authViewer = useUserData()
  const viewerId = authViewer?.id

  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [rows, setRows] = useState<FollowListEntry[]>([])
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [followBusyId, setFollowBusyId] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    if (initialTabProp) setActiveTab(initialTabProp)
    else setActiveTab(parseInitialTab(tabParam))
  }, [initialTabProp, tabParam])

  const syncTabParam = useCallback(
    (tab: ProfileConnectionsTab) => {
      setActiveTab(tab)
      router.replace({
        pathname: SCREEN_PUBLIC_PROFILE_CONNECTIONS,
        params: { userId: slug, tab },
      })
    },
    [router, slug],
  )

  useEffect(() => {
    if (!slug) {
      setResolveError('Invalid profile.')
      setProfileUserId(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const id = isRestaurantUserRouteId(slug)
          ? slug
          : (await fetchRestaurantUserByUsername(slug)).id
        if (!cancelled) {
          setProfileUserId(id)
          setResolveError(null)
        }
      } catch {
        if (!cancelled) {
          setProfileUserId(null)
          setResolveError('Could not load this profile.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const loadList = useCallback(async () => {
    if (!profileUserId) return
    setListError(null)
    try {
      const [list, viewerIds] = await Promise.all([
        activeTab === 'followers'
          ? fetchFollowersList(profileUserId)
          : fetchFollowingList(profileUserId),
        viewerId ? fetchViewerFollowingIds(viewerId) : Promise.resolve(new Set<string>()),
      ])
      setRows(list.filter((row) => row.user?.id))
      setViewerFollowingIds(viewerIds)
    } catch (e) {
      setRows([])
      setListError(e instanceof Error ? e.message : 'Could not load list.')
    }
  }, [activeTab, profileUserId, viewerId])

  useEffect(() => {
    if (!profileUserId) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const [list, viewerIds] = await Promise.all([
          activeTab === 'followers'
            ? fetchFollowersList(profileUserId)
            : fetchFollowingList(profileUserId),
          viewerId ? fetchViewerFollowingIds(viewerId) : Promise.resolve(new Set<string>()),
        ])
        if (cancelled) return
        setRows(list.filter((row) => row.user?.id))
        setViewerFollowingIds(viewerIds)
        setListError(null)
      } catch (e) {
        if (!cancelled) {
          setRows([])
          setListError(e instanceof Error ? e.message : 'Could not load list.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, profileUserId, viewerId])

  const onRefresh = useCallback(async () => {
    if (!profileUserId) return
    setRefreshing(true)
    try {
      await loadList()
    } finally {
      setRefreshing(false)
    }
  }, [loadList, profileUserId])

  const toggleFollow = useCallback(
    async (targetUserId: string, currently: boolean) => {
      if (!viewerId || followBusyId) return
      setFollowBusyId(targetUserId)
      setViewerFollowingIds((prev) => {
        const next = new Set(prev)
        if (currently) next.delete(targetUserId)
        else next.add(targetUserId)
        return next
      })
      try {
        if (currently) await unfollowRestaurantUser(targetUserId)
        else await followRestaurantUser(targetUserId)
      } catch {
        setViewerFollowingIds((prev) => {
          const next = new Set(prev)
          if (currently) next.add(targetUserId)
          else next.delete(targetUserId)
          return next
        })
      } finally {
        setFollowBusyId(null)
      }
    },
    [followBusyId, viewerId],
  )

  if (resolveError) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title="Follows" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base" style={{ color: TEXT_HEADING }}>
            {resolveError}
          </Text>
        </View>
      </View>
    )
  }

  if (!profileUserId) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title="Follows" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      </View>
    )
  }

  const listData = rows

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title="Follows" />
      <ProfileConnectionsTabBar activeTab={activeTab} onTabChange={syncTabParam} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} size="large" />
        </View>
      ) : listError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            {listError}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          key={activeTab}
          keyExtractor={(item) => item.follow_id}
          ItemSeparatorComponent={ROW_SEPARATOR}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BRAND_PRIMARY} />
          }
          contentContainerStyle={listData.length === 0 ? { flexGrow: 1 } : { paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 py-16">
              <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
                There are no users yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const user = item.user!
            const isSelf = viewerId != null && viewerId === user.id
            const isFollowing = viewerFollowingIds.has(user.id)
            return (
              <FollowListUserRow
                user={user}
                isFollowing={isFollowing}
                followLoading={followBusyId === user.id}
                showFollowButton={Boolean(viewerId) && !isSelf}
                useFollowBackLabel={activeTab === 'followers'}
                onToggleFollow={() => void toggleFollow(user.id, isFollowing)}
              />
            )
          }}
        />
      )}
    </View>
  )
}
