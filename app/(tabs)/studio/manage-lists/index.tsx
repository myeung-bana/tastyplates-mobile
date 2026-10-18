import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, RefreshControl, Text, View, useWindowDimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useNavigation } from 'expo-router'
import { LibraryCover, ListCover } from '@/components/studio/manage-lists/ListCover'
import { ManageListsEmptyState } from '@/components/studio/manage-lists/ManageListsEmptyState'
import { ManageListsTabBar } from '@/components/studio/manage-lists/ManageListsTabBar'
import type { ManageListsTab } from '@/components/studio/manage-lists/ManageListsTabBar'
import { RestaurantListSkeletonList } from '@/components/ui/Skeleton/RestaurantListSkeleton'
import {
  SCREEN_STUDIO_MANAGE_LISTS_CREATE,
  SCREEN_STUDIO_MY_LISTS,
  studioManageListDetailPath,
} from '@/constants/screens'
import { FONT } from '@/constants/typography'
import { getCheckins, getWishlist } from '@/services/restaurantUserService'
import { listDeletedSuccess, listDeleteError, listLoadError } from '@/constants/messages'
import { useSession } from '@/hooks/useSession'
import { castHref } from '@/lib/routeParams'
import { deleteList, getMyLists } from '@/services/restaurantListService'
import type { RestaurantListSummary } from '@/types/restaurantList'
import { toast } from '@/utils/toast'
import { AppIcon } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, SURFACE_CARD, TEXT_HEADING, TEXT_MUTED, TEXT_TERTIARY } from '@/constants/brand'

function filterListsByTab(lists: RestaurantListSummary[], tab: ManageListsTab): RestaurantListSummary[] {
  if (tab === 'all') return lists
  return lists.filter((list) => list.is_public === (tab === 'public'))
}

export default function ManageListsScreen(): JSX.Element {
  const navigation = useNavigation()
  const { isReady, user } = useSession()
  const isAuthenticated = user !== null

  const [lists, setLists] = useState<RestaurantListSummary[]>([])
  const [activeTab, setActiveTab] = useState<ManageListsTab>('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetched, setFetched] = useState(false)

  const { width } = useWindowDimensions()
  const hasFetchedRef = useRef(false)

  const fetchLists = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true)
    } else if (!hasFetchedRef.current) {
      setLoading(true)
    }
    try {
      const data = await getMyLists()
      setLists(data)
      setFetched(true)
      hasFetchedRef.current = true
    } catch {
      if (!hasFetchedRef.current) setLists([])
      toast.error(listLoadError)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Gate on session readiness — avoids firing before Nhost restores token from SecureStore
  useEffect(() => {
    if (isReady && isAuthenticated && !hasFetchedRef.current) {
      void fetchLists()
    }
  }, [isReady, isAuthenticated, fetchLists])

  // Refetch when returning from create / detail / edit, and recover from a failed first load
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isReady || !isAuthenticated) return
      if (hasFetchedRef.current) {
        void fetchLists(true)
      } else {
        void fetchLists()
      }
    })
    return unsubscribe
  }, [navigation, isReady, isAuthenticated, fetchLists])

  // Library counts for the two system lists (Saved / Check-ins).
  const [libraryCounts, setLibraryCounts] = useState<{ saved: number; visits: number } | null>(null)
  useEffect(() => {
    if (!isReady || !user?.id) return
    let cancelled = false
    void Promise.all([
      getWishlist({ user_id: user.id, limit: 1 }).catch(() => null),
      getCheckins({ user_id: user.id, limit: 1 }).catch(() => null),
    ]).then(([w, c]) => {
      if (!cancelled) setLibraryCounts({ saved: w?.meta.total ?? 0, visits: c?.meta.total ?? 0 })
    })
    return () => {
      cancelled = true
    }
  }, [isReady, user?.id, refreshing])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new list"
          hitSlop={8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push(castHref(SCREEN_STUDIO_MANAGE_LISTS_CREATE))
          }}
          className="items-center justify-center active:opacity-80"
          style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: BRAND_PRIMARY }}
        >
          <Text style={{ fontFamily: FONT.heading, fontSize: 15, letterSpacing: 0.6, color: TEXT_HEADING }}>Create</Text>
        </Pressable>
      ),
    })
  }, [navigation])

  const filteredLists = useMemo(
    () => filterListsByTab(lists, activeTab),
    [lists, activeTab],
  )

  const deleteNow = useCallback(
    async (list: RestaurantListSummary) => {
      const prev = lists
      setLists((cur) => cur.filter((l) => l.uuid !== list.uuid))
      try {
        await deleteList(list.uuid)
        toast.success(listDeletedSuccess)
      } catch {
        setLists(prev)
        toast.error(listDeleteError)
      }
    },
    [lists],
  )

  /** Confirm before deleting the whole playlist (design L6). */
  const confirmDelete = useCallback(
    (list: RestaurantListSummary) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      const count = list.items_count ?? 0
      Alert.alert(
        `Delete “${list.title}”?`,
        `The list and its ${count} ${count === 1 ? 'restaurant' : 'restaurants'} will be removed. The restaurants themselves stay saved anywhere else you added them.`,
        [
          { text: 'Keep it', style: 'cancel' },
          { text: 'Delete list', style: 'destructive', onPress: () => void deleteNow(list) },
        ],
      )
    },
    [deleteNow],
  )

  const openList = useCallback((list: RestaurantListSummary) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: castHref(studioManageListDetailPath(list.uuid)) as never,
      params: {
        slug: list.slug,
        title: list.title,
        display_pic: list.display_pic?.trim() || list.cover_image_url?.trim() || '',
      },
    })
  }, [])

  const showSkeleton = !isReady || (loading && !fetched)
  const noListsAtAll = fetched && lists.length === 0
  const tile = Math.floor((width - GUTTER * 2 - GRID_GAP) / 2)

  const header = (
    <View style={{ gap: 22, paddingBottom: 12 }}>
      {activeTab === 'all' ? (
        <View style={{ gap: 12 }}>
          <Eyebrow>Your library</Eyebrow>
          <View className="flex-row" style={{ gap: GRID_GAP }}>
            <CoverTile
              width={tile}
              cover={<LibraryCover kind="saved" size={tile} />}
              title="Saved"
              meta={libraryCounts ? `${libraryCounts.saved} ${libraryCounts.saved === 1 ? 'place' : 'places'}` : ' '}
              onPress={() => router.push({ pathname: SCREEN_STUDIO_MY_LISTS, params: { tab: 'todine' } })}
            />
            <CoverTile
              width={tile}
              cover={<LibraryCover kind="visited" size={tile} />}
              title="Check-ins"
              meta={libraryCounts ? `${libraryCounts.visits} ${libraryCounts.visits === 1 ? 'visit' : 'visits'}` : ' '}
              onPress={() => router.push({ pathname: SCREEN_STUDIO_MY_LISTS, params: { tab: 'checkins' } })}
            />
          </View>
        </View>
      ) : null}
      <Eyebrow>Your lists</Eyebrow>
    </View>
  )

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: SURFACE_CARD }} edges={['left', 'right', 'bottom']}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 14 }}>
        <ManageListsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {showSkeleton ? (
        <View className="flex-1" style={{ paddingHorizontal: GUTTER }}>
          <RestaurantListSkeletonList count={4} />
        </View>
      ) : (
        <FlashList
          data={filteredLists}
          numColumns={2}
          keyExtractor={(item) => item.uuid}
          ListHeaderComponent={header}
          renderItem={({ item, index }) => {
            const count = typeof item.items_count === 'number' ? item.items_count : 0
            return (
              <View style={{ paddingLeft: index % 2 === 0 ? 0 : GRID_GAP / 2, paddingRight: index % 2 === 0 ? GRID_GAP / 2 : 0, paddingBottom: 20 }}>
                <CoverTile
                  width={tile}
                  cover={
                    <ListCover
                      title={item.title}
                      count={count}
                      imageUrl={item.display_pic}
                      seed={item.uuid}
                      size={tile}
                    />
                  }
                  title={item.title}
                  meta={`${count} ${count === 1 ? 'place' : 'places'}${item.is_public ? '' : ' · Private'}`}
                  onPress={() => openList(item)}
                  onMore={() => confirmDelete(item)}
                />
              </View>
            )
          }}
          ListEmptyComponent={
            fetched && filteredLists.length === 0 ? (
              <ManageListsEmptyState tab={activeTab} noListsAtAll={noListsAtAll} />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void fetchLists(true)} tintColor={BRAND_PRIMARY} />
          }
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 120 }}
        />
      )}
    </SafeAreaView>
  )
}

const GUTTER = 20
const GRID_GAP = 12

function Eyebrow({ children }: { children: string }): JSX.Element {
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: FONT.heading, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}
    >
      {children}
    </Text>
  )
}

/** Square cover + title + meta (design L1). `onMore` adds the ⋯ menu (delete). */
function CoverTile({
  width,
  cover,
  title,
  meta,
  onPress,
  onMore,
}: {
  width: number
  cover: JSX.Element
  title: string
  meta: string
  onPress: () => void
  onMore?: () => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      onPress={onPress}
      className="active:opacity-90"
      style={{ width, gap: 8 }}
    >
      {cover}
      <View style={{ gap: 4 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 15, color: TEXT_HEADING }}>
          {title}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_TERTIARY }}>
          {meta}
        </Text>
      </View>
      {onMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Options for ${title}`}
          onPress={onMore}
          hitSlop={8}
          className="absolute items-center justify-center"
          style={{
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: 'rgba(252,252,252,0.92)',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        >
          <AppIcon name="more-horizontal" size={16} color={TEXT_HEADING} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
