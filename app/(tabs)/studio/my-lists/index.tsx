import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshControl, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Swipeable } from 'react-native-gesture-handler'

import { MyListsEmptyState } from '@/components/studio/my-lists/MyListsEmptyState'
import { MyListsRestaurantRow } from '@/components/studio/my-lists/MyListsRestaurantRow'
import { MyListsTabBar } from '@/components/studio/my-lists/MyListsTabBar'
import type { MyListsTab } from '@/components/studio/my-lists/MyListsTabBar'
import { RestaurantListSkeletonList } from '@/components/ui/Skeleton/RestaurantListSkeleton'
import { checkInStatusError, favoriteStatusError, removedFromWishlistSuccess, uncheckInRestaurantSuccess } from '@/constants/messages'
import { useAuth } from '@/hooks/useAuth'
import { dedupeRestaurants, mapHasuraRestaurantToListItem } from '@/lib/myListsRestaurant'
import type { MyListRestaurant } from '@/lib/myListsRestaurant'
import { getCheckins, getWishlist } from '@/services/restaurantUserService'
import { toggleCheckinBySlug, toggleFavoriteBySlug } from '@/services/restaurantEngagementService'
import { toast } from '@/utils/toast'

export default function MyListsScreen(): JSX.Element {
  const { authUser } = useAuth()
  const userId = authUser?.id ?? null

  const [activeTab, setActiveTab] = useState<MyListsTab>('todine')

  const [todineItems, setTodineItems] = useState<MyListRestaurant[]>([])
  const [todineLoading, setTodineLoading] = useState(false)
  const [todineRefreshing, setTodineRefreshing] = useState(false)
  const [todineFetched, setTodineFetched] = useState(false)

  const [checkinItems, setCheckinItems] = useState<MyListRestaurant[]>([])
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinRefreshing, setCheckinRefreshing] = useState(false)
  const [checkinFetched, setCheckinFetched] = useState(false)

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map())

  const fetchTodine = useCallback(async (refresh = false) => {
    if (!userId) return
    if (refresh) {
      setTodineItems([])
      setTodineFetched(false)
      setTodineRefreshing(true)
    } else {
      setTodineLoading(true)
    }
    try {
      const res = await getWishlist({ user_id: userId, limit: 50, offset: 0 })
      const mapped = res.items
        .filter((item) => item.restaurant != null)
        .map((item) => mapHasuraRestaurantToListItem(item.restaurant!))
      setTodineItems(dedupeRestaurants(mapped))
      setTodineFetched(true)
    } catch {
      toast.error(favoriteStatusError)
    } finally {
      setTodineLoading(false)
      setTodineRefreshing(false)
    }
  }, [userId])

  const fetchCheckins = useCallback(async (refresh = false) => {
    if (!userId) return
    if (refresh) {
      setCheckinItems([])
      setCheckinFetched(false)
      setCheckinRefreshing(true)
    } else {
      setCheckinLoading(true)
    }
    try {
      const res = await getCheckins({ user_id: userId, limit: 50, offset: 0 })
      const mapped = res.items
        .filter((item) => item.restaurant != null)
        .map((item) => mapHasuraRestaurantToListItem(item.restaurant!))
      setCheckinItems(dedupeRestaurants(mapped))
      setCheckinFetched(true)
    } catch {
      toast.error(checkInStatusError)
    } finally {
      setCheckinLoading(false)
      setCheckinRefreshing(false)
    }
  }, [userId])

  // Fetch To-Dine on mount
  useEffect(() => {
    if (userId && !todineFetched && !todineLoading) {
      void fetchTodine()
    }
  }, [userId, todineFetched, todineLoading, fetchTodine])

  // Lazy-load Check-ins on first tab activation
  useEffect(() => {
    if (activeTab === 'checkins' && userId && !checkinFetched && !checkinLoading) {
      void fetchCheckins()
    }
  }, [activeTab, userId, checkinFetched, checkinLoading, fetchCheckins])

  const handleRemoveTodine = useCallback(async (restaurant: MyListRestaurant) => {
    const originalIndex = todineItems.findIndex((r) => r.slug === restaurant.slug)
    setTodineItems((prev) => prev.filter((r) => r.slug !== restaurant.slug))
    try {
      await toggleFavoriteBySlug(restaurant.slug)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      toast.success(removedFromWishlistSuccess)
    } catch {
      toast.error(favoriteStatusError)
      setTodineItems((prev) => {
        const idx = originalIndex < 0 ? prev.length : originalIndex
        return [...prev.slice(0, idx), restaurant, ...prev.slice(idx)]
      })
    }
  }, [todineItems])

  const handleRemoveCheckin = useCallback(async (restaurant: MyListRestaurant) => {
    const originalIndex = checkinItems.findIndex((r) => r.slug === restaurant.slug)
    setCheckinItems((prev) => prev.filter((r) => r.slug !== restaurant.slug))
    try {
      await toggleCheckinBySlug(restaurant.slug)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      toast.success(uncheckInRestaurantSuccess)
    } catch {
      toast.error(checkInStatusError)
      setCheckinItems((prev) => {
        const idx = originalIndex < 0 ? prev.length : originalIndex
        return [...prev.slice(0, idx), restaurant, ...prev.slice(idx)]
      })
    }
  }, [checkinItems])

  const isTodine = activeTab === 'todine'
  const items = isTodine ? todineItems : checkinItems
  const loading = isTodine ? todineLoading : checkinLoading
  const refreshing = isTodine ? todineRefreshing : checkinRefreshing
  const handleRemove = isTodine ? handleRemoveTodine : handleRemoveCheckin
  const handleRefresh = isTodine ? () => void fetchTodine(true) : () => void fetchCheckins(true)

  return (
    <SafeAreaView className="flex-1 bg-white px-6" edges={['left', 'right', 'bottom']}>
      <View className="mt-4">
        <MyListsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      <View className="mt-6 flex-1">
        {loading && items.length === 0 ? (
          <RestaurantListSkeletonList showRating />
        ) : (
          <FlashList
            data={items}
            keyExtractor={(r) => r.id || r.slug}
            renderItem={({ item }) => (
              <MyListsRestaurantRow
                restaurant={item}
                swipeableRefs={swipeableRefs}
                onRemove={(r) => void handleRemove(r)}
              />
            )}
            ListEmptyComponent={
              !loading ? <MyListsEmptyState tab={activeTab} /> : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#ff7c0a"
              />
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </SafeAreaView>
  )
}
