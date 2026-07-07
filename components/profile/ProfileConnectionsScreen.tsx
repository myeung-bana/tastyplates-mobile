import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useUserData } from '@nhost/react'

import { FollowListSkeletonList } from '@/components/profile/FollowListSkeleton'
import { FollowListUserRow } from '@/components/profile/FollowListUserRow'
import {
  ProfileConnectionsTabBar,
  type ProfileConnectionsTab,
} from '@/components/profile/ProfileConnectionsTabBar'
import { ReviewDetailTopNav } from '@/components/review/ReviewDetailTopNav'
import { BRAND_PRIMARY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
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
  fetchRestaurantUserById,
  fetchRestaurantUserByUsername,
  isRestaurantUserRouteId,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'

const ROW_SEPARATOR = () => (
  <View style={{ height: 1, backgroundColor: '#e5e7eb', marginHorizontal: 20 }} />
)

type TabCacheStatus = 'idle' | 'loading' | 'ready' | 'error'

type TabCache = {
  rows: FollowListEntry[]
  status: TabCacheStatus
  error: string | null
  refreshing: boolean
}

function emptyTabCache(): TabCache {
  return {
    rows: [],
    status: 'idle',
    error: null,
    refreshing: false,
  }
}

function parseInitialTab(raw: string | undefined): ProfileConnectionsTab {
  return raw === 'following' ? 'following' : 'followers'
}

function tabToPageIndex(tab: ProfileConnectionsTab): number {
  return tab === 'following' ? 1 : 0
}

function pageIndexToTab(index: number): ProfileConnectionsTab {
  return index === 1 ? 'following' : 'followers'
}

function pageIndexFromOffset(offsetX: number, pageWidth: number): number {
  if (pageWidth <= 0) return 0
  return Math.min(1, Math.max(0, Math.round(offsetX / pageWidth)))
}

function formatNavTitle(user: RestaurantUserRow | null, slug: string): string {
  const handle = user?.username?.trim().replace(/^@/, '')
  if (handle) return `@${handle}`
  const name = user?.display_name?.trim()
  if (name) return name
  if (slug) return `@${slug}`
  return 'Profile'
}

function filterRows(list: FollowListEntry[]): FollowListEntry[] {
  return list.filter((row) => row.user?.id)
}

type ProfileConnectionsScreenProps = {
  /** When set, overrides the `tab` search param (legacy followers/following routes). */
  initialTab?: ProfileConnectionsTab
}

type ConnectionsListPanelProps = {
  tab: ProfileConnectionsTab
  cache: TabCache
  viewerId: string | undefined
  viewerFollowingIds: Set<string>
  followBusyId: string | null
  onRefresh: () => void
  onToggleFollow: (targetUserId: string, currently: boolean) => void
}

function ConnectionsListPanel({
  tab,
  cache,
  viewerId,
  viewerFollowingIds,
  followBusyId,
  onRefresh,
  onToggleFollow,
}: ConnectionsListPanelProps): JSX.Element {
  const renderItem: ListRenderItem<FollowListEntry> = useCallback(
    ({ item }) => {
      const user = item.user!
      const isSelf = viewerId != null && viewerId === user.id
      const isFollowing = viewerFollowingIds.has(user.id)
      return (
        <FollowListUserRow
          user={user}
          isFollowing={isFollowing}
          followLoading={followBusyId === user.id}
          showFollowButton={Boolean(viewerId) && !isSelf}
          useFollowBackLabel={tab === 'followers'}
          onToggleFollow={() => onToggleFollow(user.id, isFollowing)}
        />
      )
    },
    [followBusyId, onToggleFollow, tab, viewerFollowingIds, viewerId],
  )

  if (cache.status === 'idle' || cache.status === 'loading') {
    return <FollowListSkeletonList />
  }

  if (cache.status === 'error') {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
          {cache.error ?? 'Could not load list.'}
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      data={cache.rows}
      nestedScrollEnabled
      removeClippedSubviews={false}
      keyExtractor={(item) => item.follow_id}
      ItemSeparatorComponent={ROW_SEPARATOR}
      refreshControl={
        <RefreshControl
          refreshing={cache.refreshing}
          onRefresh={onRefresh}
          tintColor={BRAND_PRIMARY}
        />
      }
      contentContainerStyle={cache.rows.length === 0 ? { flexGrow: 1 } : { paddingBottom: 24 }}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-8 py-16">
          <Text className="text-center text-sm" style={{ color: TEXT_MUTED }}>
            There are no users yet.
          </Text>
        </View>
      }
      renderItem={renderItem}
    />
  )
}

export function ProfileConnectionsScreen({
  initialTab: initialTabProp,
}: ProfileConnectionsScreenProps): JSX.Element {
  const { width: pageWidth } = useWindowDimensions()
  const pagerRef = useRef<ScrollView>(null)
  const didInitialScrollRef = useRef(false)
  const scrollLockTabRef = useRef<ProfileConnectionsTab | null>(null)
  const loadingTabsRef = useRef(new Set<ProfileConnectionsTab>())
  const followersStatusRef = useRef<TabCacheStatus>('idle')
  const followingStatusRef = useRef<TabCacheStatus>('idle')

  const raw = useLocalSearchParams<{ userId: string | string[]; tab?: string | string[] }>()
  const slug = useMemo(() => firstSegmentParam(raw.userId).trim().replace(/^@/, ''), [raw.userId])
  const tabParam = firstSegmentParam(raw.tab)
  const entryTab = initialTabProp ?? parseInitialTab(tabParam)

  const [activeTab, setActiveTab] = useState<ProfileConnectionsTab>(entryTab)
  const [profileUser, setProfileUser] = useState<RestaurantUserRow | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [profileResolving, setProfileResolving] = useState(true)

  const [followersCache, setFollowersCache] = useState<TabCache>(emptyTabCache)
  const [followingCache, setFollowingCache] = useState<TabCache>(emptyTabCache)
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set())
  const [followBusyId, setFollowBusyId] = useState<string | null>(null)

  const authViewer = useUserData()
  const viewerId = authViewer?.id
  const profileUserId = profileUser?.id ?? null
  const navTitle = formatNavTitle(profileUser, slug)

  const scrollToPage = useCallback(
    (index: number, animated: boolean) => {
      if (pageWidth <= 0) return
      pagerRef.current?.scrollTo({ x: index * pageWidth, animated })
    },
    [pageWidth],
  )

  useEffect(() => {
    didInitialScrollRef.current = false
    scrollLockTabRef.current = null
    loadingTabsRef.current = new Set()
    followersStatusRef.current = 'idle'
    followingStatusRef.current = 'idle'
    setActiveTab(entryTab)
    setFollowersCache(emptyTabCache())
    setFollowingCache(emptyTabCache())
  }, [entryTab, slug])

  useEffect(() => {
    if (pageWidth <= 0 || !profileUserId || didInitialScrollRef.current) return
    didInitialScrollRef.current = true
    scrollToPage(tabToPageIndex(entryTab), false)
  }, [entryTab, pageWidth, profileUserId, scrollToPage])

  const getCacheSetter = useCallback((tab: ProfileConnectionsTab) => {
    return tab === 'followers' ? setFollowersCache : setFollowingCache
  }, [])

  const getStatusRef = useCallback((tab: ProfileConnectionsTab) => {
    return tab === 'followers' ? followersStatusRef : followingStatusRef
  }, [])

  const loadTab = useCallback(
    async (tab: ProfileConnectionsTab, options?: { force?: boolean }) => {
      if (!profileUserId) return

      const statusRef = getStatusRef(tab)
      if (!options?.force) {
        if (statusRef.current === 'ready' || statusRef.current === 'loading') return
        if (loadingTabsRef.current.has(tab)) return
      }

      loadingTabsRef.current.add(tab)
      statusRef.current = 'loading'
      getCacheSetter(tab)({ rows: [], status: 'loading', error: null, refreshing: false })

      try {
        const list =
          tab === 'followers'
            ? await fetchFollowersList(profileUserId)
            : await fetchFollowingList(profileUserId)

        statusRef.current = 'ready'
        getCacheSetter(tab)({
          rows: filterRows(list),
          status: 'ready',
          error: null,
          refreshing: false,
        })
      } catch (e) {
        statusRef.current = 'error'
        getCacheSetter(tab)({
          rows: [],
          status: 'error',
          error: e instanceof Error ? e.message : 'Could not load list.',
          refreshing: false,
        })
      } finally {
        loadingTabsRef.current.delete(tab)
      }
    },
    [getCacheSetter, getStatusRef, profileUserId],
  )

  useEffect(() => {
    if (!profileUserId) return
    void loadTab(entryTab)

    if (!viewerId) return
    let cancelled = false
    void (async () => {
      try {
        const viewerIds = await fetchViewerFollowingIds(viewerId)
        if (!cancelled) setViewerFollowingIds(viewerIds)
      } catch {
        // Follow buttons fall back to "Follow" until pull-to-refresh.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [entryTab, loadTab, profileUserId, viewerId])

  const handlePagerScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth <= 0) return

      const lockedTab = scrollLockTabRef.current
      if (lockedTab) {
        const targetOffset = tabToPageIndex(lockedTab) * pageWidth
        if (Math.abs(event.nativeEvent.contentOffset.x - targetOffset) < 1) {
          scrollLockTabRef.current = null
        }
        return
      }

      const index = pageIndexFromOffset(event.nativeEvent.contentOffset.x, pageWidth)
      const tab = pageIndexToTab(index)
      setActiveTab((prev) => (prev === tab ? prev : tab))
    },
    [pageWidth],
  )

  const handlePagerScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollLockTabRef.current = null
      if (pageWidth <= 0) return
      const index = pageIndexFromOffset(event.nativeEvent.contentOffset.x, pageWidth)
      const tab = pageIndexToTab(index)
      setActiveTab(tab)
      void loadTab(tab)
    },
    [loadTab, pageWidth],
  )

  const selectTab = useCallback(
    (tab: ProfileConnectionsTab) => {
      if (tab === activeTab) return
      scrollLockTabRef.current = tab
      setActiveTab(tab)
      scrollToPage(tabToPageIndex(tab), true)
      void loadTab(tab)
    },
    [activeTab, loadTab, scrollToPage],
  )

  useEffect(() => {
    if (!slug) {
      setResolveError('Invalid profile.')
      setProfileUser(null)
      setProfileResolving(false)
      return
    }

    let cancelled = false
    setProfileResolving(true)
    void (async () => {
      try {
        const user = isRestaurantUserRouteId(slug)
          ? await fetchRestaurantUserById(slug)
          : await fetchRestaurantUserByUsername(slug)
        if (!cancelled) {
          setProfileUser(user)
          setResolveError(null)
        }
      } catch {
        if (!cancelled) {
          setProfileUser(null)
          setResolveError('Could not load this profile.')
        }
      } finally {
        if (!cancelled) setProfileResolving(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug])

  const refreshTab = useCallback(
    async (tab: ProfileConnectionsTab) => {
      if (!profileUserId) return
      const setCache = getCacheSetter(tab)
      const statusRef = getStatusRef(tab)

      setCache((prev) => ({ ...prev, refreshing: true, error: null }))
      try {
        const [list, viewerIds] = await Promise.all([
          tab === 'followers'
            ? fetchFollowersList(profileUserId)
            : fetchFollowingList(profileUserId),
          viewerId ? fetchViewerFollowingIds(viewerId) : Promise.resolve(null),
        ])
        statusRef.current = 'ready'
        setCache({
          rows: filterRows(list),
          status: 'ready',
          error: null,
          refreshing: false,
        })
        if (viewerIds) setViewerFollowingIds(viewerIds)
      } catch (e) {
        statusRef.current = 'error'
        setCache((prev) => ({
          ...prev,
          status: 'error',
          refreshing: false,
          error: e instanceof Error ? e.message : 'Could not load list.',
        }))
      }
    },
    [getCacheSetter, getStatusRef, profileUserId, viewerId],
  )

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
        <ReviewDetailTopNav title={navTitle} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base" style={{ color: TEXT_HEADING }}>
            {resolveError}
          </Text>
        </View>
      </View>
    )
  }

  if (profileResolving || !profileUserId) {
    return (
      <View className="flex-1 bg-white">
        <ReviewDetailTopNav title={navTitle} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      <ReviewDetailTopNav title={navTitle} />
      <ProfileConnectionsTabBar activeTab={activeTab} onTabChange={selectTab} />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          scrollEnabled={pageWidth > 0}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          directionalLockEnabled
          removeClippedSubviews={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexDirection: 'row',
            width: pageWidth > 0 ? pageWidth * 2 : undefined,
            height: '100%',
          }}
          onScroll={handlePagerScroll}
          onMomentumScrollEnd={handlePagerScrollEnd}
        >
          <View style={{ width: pageWidth, height: '100%' }}>
            <ConnectionsListPanel
              tab="followers"
              cache={followersCache}
              viewerId={viewerId}
              viewerFollowingIds={viewerFollowingIds}
              followBusyId={followBusyId}
              onRefresh={() => void refreshTab('followers')}
              onToggleFollow={(targetUserId, currently) => void toggleFollow(targetUserId, currently)}
            />
          </View>
          <View style={{ width: pageWidth, height: '100%' }}>
            <ConnectionsListPanel
              tab="following"
              cache={followingCache}
              viewerId={viewerId}
              viewerFollowingIds={viewerFollowingIds}
              followBusyId={followBusyId}
              onRefresh={() => void refreshTab('following')}
              onToggleFollow={(targetUserId, currently) => void toggleFollow(targetUserId, currently)}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  )
}
