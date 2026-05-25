import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Pressable, RefreshControl, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { Swipeable } from 'react-native-gesture-handler'
import { ManageListCreateRow } from '@/components/studio/manage-lists/ManageListCreateRow'
import { ManageListsEmptyState } from '@/components/studio/manage-lists/ManageListsEmptyState'
import { ManageListRow } from '@/components/studio/manage-lists/ManageListRow'
import { ManageListsTabBar } from '@/components/studio/manage-lists/ManageListsTabBar'
import type { ManageListsTab } from '@/components/studio/manage-lists/ManageListsTabBar'
import { RestaurantListSkeletonList } from '@/components/ui/Skeleton/RestaurantListSkeleton'
import { SCREEN_STUDIO_MANAGE_LISTS_CREATE } from '@/constants/screens'
import { listDeletedSuccess, listDeleteError, listLoadError } from '@/constants/messages'
import { castHref } from '@/lib/routeParams'
import { deleteList, getMyLists } from '@/services/restaurantListService'
import type { RestaurantListSummary } from '@/types/restaurantList'
import { toast } from '@/utils/toast'

function filterListsByTab(lists: RestaurantListSummary[], tab: ManageListsTab): RestaurantListSummary[] {
  if (tab === 'all') return lists
  return lists.filter((list) => list.is_public === (tab === 'public'))
}

export default function ManageListsScreen(): JSX.Element {
  const navigation = useNavigation()

  const [lists, setLists] = useState<RestaurantListSummary[]>([])
  const [activeTab, setActiveTab] = useState<ManageListsTab>('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetched, setFetched] = useState(false)

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map())
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

  useEffect(() => {
    void fetchLists()
  }, [fetchLists])

  // Refetch owned lists when returning from create / detail / edit
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (hasFetchedRef.current) void fetchLists(true)
    })
    return unsubscribe
  }, [navigation, fetchLists])

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
          className="mr-1 h-9 w-9 items-center justify-center rounded-full bg-orange-50"
        >
          <Ionicons name="add" size={22} color="#ff7c0a" />
        </Pressable>
      ),
    })
  }, [navigation])

  const filteredLists = useMemo(
    () => filterListsByTab(lists, activeTab),
    [lists, activeTab],
  )

  const handleDelete = useCallback(
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

  const showSkeleton = loading && !fetched
  const noListsAtAll = fetched && lists.length === 0

  return (
    <SafeAreaView className="flex-1 bg-white px-6" edges={['left', 'right', 'bottom']}>
      <View className="mt-4">
        <ManageListsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      <View className="mt-6 flex-1">
        {showSkeleton ? (
          <View className="flex-1">
            <ManageListCreateRow />
            <RestaurantListSkeletonList count={5} />
          </View>
        ) : (
          <FlashList
            data={filteredLists}
            keyExtractor={(item) => item.uuid}
            ListHeaderComponent={<ManageListCreateRow />}
            renderItem={({ item }) => (
              <ManageListRow
                list={item}
                swipeableRefs={swipeableRefs}
                onDelete={(l) => void handleDelete(l)}
              />
            )}
            ListEmptyComponent={
              fetched && filteredLists.length === 0 ? (
                <ManageListsEmptyState tab={activeTab} noListsAtAll={noListsAtAll} />
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void fetchLists(true)}
                tintColor="#ff7c0a"
              />
            }
            contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  )
}
