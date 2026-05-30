import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Image, Pressable, RefreshControl, Share, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import type { Swipeable } from 'react-native-gesture-handler'
import { AppIcon } from '@/components/ui/AppIcon'

import { ListDetailEmptyState } from '@/components/studio/manage-lists/ListDetailEmptyState'
import { ManageListAddRestaurantRow } from '@/components/studio/manage-lists/ManageListAddRestaurantRow'
import { ManageListItemRow } from '@/components/studio/manage-lists/ManageListItemRow'
import { RestaurantListSkeletonList } from '@/components/ui/Skeleton/RestaurantListSkeleton'
import { BRAND_PRIMARY } from '@/constants/brand'
import {
  listDeletedSuccess,
  listDeleteError,
  listItemRemovedSuccess,
  listItemRemoveError,
  listUpdatedSuccess,
  listUpdateError,
} from '@/constants/messages'
import {
  studioManageListAddPath,
  studioManageListEditPath,
} from '@/constants/screens'
import { castHref } from '@/lib/routeParams'
import { firstSegmentParam } from '@/lib/routeParams'
import {
  deleteList,
  getListBySlug,
  removeListItem,
  updateList,
} from '@/services/restaurantListService'
import type { RestaurantListDetail, RestaurantListItem } from '@/types/restaurantList'
import { toast } from '@/utils/toast'

const SHARE_BASE = 'https://tastyplates.co/lists/share'

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function ListDetailScreen(): JSX.Element {
  const params = useLocalSearchParams()
  const uuid = firstSegmentParam(params.uuid)
  const slugParam = firstSegmentParam(params.slug)
  const titleParam = firstSegmentParam(params.title)
  const displayPicParam = firstSegmentParam(params.display_pic)

  const navigation = useNavigation()

  const [list, setList] = useState<RestaurantListDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [makingPublic, setMakingPublic] = useState(false)

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map())

  const fetchDetail = useCallback(
    async (refresh = false) => {
      // slug is passed from create / hub navigation; fall back to uuid-based cache
      const slugToFetch = list?.slug ?? slugParam
      if (!slugToFetch) return

      if (refresh) {
        setRefreshing(true)
      } else if (!fetched) {
        setLoading(true)
      }

      try {
        const detail = await getListBySlug(slugToFetch)
        setList(detail)
        setFetched(true)
        navigation.setOptions({ title: detail.title })
      } catch {
        // Show what we have or empty
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [slugParam, fetched, list?.slug, navigation],
  )

  useEffect(() => {
    void fetchDetail()
    if (titleParam) {
      navigation.setOptions({ title: titleParam })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (list?.title) {
      navigation.setOptions({ title: list.title })
    }
  }, [list?.title, navigation])

  // Refresh detail when returning from add-restaurant screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (fetched) void fetchDetail(true)
    })
    return unsubscribe
  }, [navigation, fetched, fetchDetail])

  const handleRemoveItem = useCallback(
    async (item: RestaurantListItem) => {
      if (!list) return
      const prevItems = list.items
      setList((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev)
      try {
        await removeListItem({ list_uuid: list.uuid, item_id: item.id })
        toast.success(listItemRemovedSuccess)
      } catch {
        setList((prev) => prev ? { ...prev, items: prevItems } : prev)
        toast.error(listItemRemoveError)
      }
    },
    [list],
  )

  const handleMakePublic = useCallback(async () => {
    if (!list) return
    setMakingPublic(true)
    try {
      await updateList({ list_uuid: list.uuid, is_public: true })
      setList((prev) => prev ? { ...prev, is_public: true } : prev)
      toast.success(listUpdatedSuccess)
    } catch {
      toast.error(listUpdateError)
    } finally {
      setMakingPublic(false)
    }
  }, [list])

  const handleShare = useCallback(() => {
    if (!list) return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const shareToken = list.share_token
    if (shareToken) {
      void Share.share({ url: `${SHARE_BASE}/${shareToken}`, message: `Check out my restaurant list: ${list.title}` })
    } else {
      void Share.share({ url: `https://tastyplates.co/lists/${list.slug}`, message: `Check out my restaurant list: ${list.title}` })
    }
  }, [list])

  const handleDelete = useCallback(() => {
    if (!list) return
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteList(list.uuid)
                toast.success(listDeletedSuccess)
                router.back()
              } catch {
                toast.error(listDeleteError)
              }
            })()
          },
        },
      ],
    )
  }, [list])

  const items = list?.items ?? []
  const itemCount = items.length
  const isEmpty = itemCount === 0
  const visibilityLabel = list?.is_public ? 'Public' : 'Private'
  const updatedLabel = list ? formatRelativeTime(list.updated_at) : ''

  const openAddRestaurant = useCallback(() => {
    router.push(castHref(studioManageListAddPath(uuid)))
  }, [uuid])

  const coverUri =
    list?.display_pic?.trim() ||
    list?.cover_image_url?.trim() ||
    displayPicParam?.trim() ||
    list?.items[0]?.image_url?.trim() ||
    null

  if (loading && !fetched) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['left', 'right', 'bottom']}>
        <RestaurantListSkeletonList count={5} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right', 'bottom']}>
      <FlashList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ManageListItemRow
            item={item}
            swipeableRefs={swipeableRefs}
            onRemove={(i) => void handleRemoveItem(i)}
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Spotify-style centered list artwork */}
            <View className="items-center px-4 pt-6 pb-2">
              <View
                className="items-center justify-center overflow-hidden rounded-lg bg-gray-100"
                style={{
                  width: 200,
                  height: 200,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                {coverUri ? (
                  <Image
                    source={{ uri: coverUri }}
                    style={{ width: 200, height: 200 }}
                    resizeMode="cover"
                  />
                ) : (
                  <AppIcon name="image" size={72} color="#9ca3af" />
                )}
              </View>
            </View>

            {/* List metadata header */}
            <View className="border-b border-gray-100 px-4 pt-2 pb-3">
              {list?.description ? (
                <Text className="font-neusans text-sm text-[#6b7280]" numberOfLines={3}>
                  {list.description}
                </Text>
              ) : null}
              <Text className={`font-neusans text-xs text-[#9ca3af]${list?.description ? ' mt-2' : ''}`}>
                {`${itemCount} ${itemCount === 1 ? 'place' : 'places'} · ${visibilityLabel} · Updated ${updatedLabel}`}
              </Text>

              {/* Action row */}
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Pressable
                  accessibilityRole="button"
                  onPress={handleShare}
                  className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
                >
                  <AppIcon name="share-2" size={14} color="#374151" />
                  <Text className="font-neusans text-sm text-[#374151]">Share Link</Text>
                </Pressable>

                {!list?.is_public ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handleMakePublic()}
                    disabled={makingPublic}
                    className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
                  >
                    <AppIcon name="globe" size={14} color="#374151" />
                    <Text className="font-neusans text-sm text-[#374151]">
                      {makingPublic ? 'Saving…' : 'Make Public'}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!list) return
                    router.push({
                      pathname: castHref(studioManageListEditPath(uuid)) as never,
                      params: {
                        title: list.title,
                        description: list.description ?? '',
                        is_public: list.is_public ? 'true' : 'false',
                      },
                    })
                  }}
                  className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
                >
                  <AppIcon name="edit-2" size={14} color="#374151" />
                  <Text className="font-neusans text-sm text-[#374151]">Edit</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleDelete}
                  className="flex-row items-center gap-2 rounded-[50px] border border-red-200 bg-white px-4 py-2"
                >
                  <AppIcon name="trash-2" size={14} color="#ef4444" />
                  <Text className="font-neusans text-sm text-red-500">Delete</Text>
                </Pressable>
              </View>
            </View>

            <ManageListAddRestaurantRow onPress={openAddRestaurant} />
          </View>
        }
        ListEmptyComponent={
          isEmpty ? <ListDetailEmptyState onAddRestaurant={openAddRestaurant} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchDetail(true)}
            tintColor={BRAND_PRIMARY}
          />
        }
        contentContainerStyle={{
          paddingBottom: 32,
          flexGrow: isEmpty ? 1 : undefined,
        }}
      />
    </SafeAreaView>
  )
}
