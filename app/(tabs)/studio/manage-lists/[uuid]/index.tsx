import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Pressable, RefreshControl, Share, Text, View } from 'react-native'
import { ListCover } from '@/components/studio/manage-lists/ListCover'
import { FONT } from '@/constants/typography'
import { SURFACE_FOG, TEXT_HEADING as TEXT_HEADING_LIST, TEXT_MUTED as TEXT_MUTED_LIST } from '@/constants/brand'
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
  listDetailLoadError,
  listItemRemovedSuccess,
  listItemRemoveError,
  listUpdatedSuccess,
  listUpdateError,
} from '@/constants/messages'
import {
  studioManageListEditPath,
} from '@/constants/screens'
import { useAddRestaurantOverlay } from '@/contexts/AddRestaurantOverlayContext'
import { useModeration } from '@/contexts/ModerationContext'
import { useAuth } from '@/hooks/useAuth'
import { castHref } from '@/lib/routeParams'
import { firstSegmentParam } from '@/lib/routeParams'
import {
  deleteList,
  getListBySlug,
  getListByUuid,
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
  const { user } = useAuth()

  const [list, setList] = useState<RestaurantListDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [makingPublic, setMakingPublic] = useState(false)

  const { openAddRestaurant, isOpen: addOverlayOpen } = useAddRestaurantOverlay()
  const addOverlayWasOpenRef = useRef(false)
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map())

  const fetchDetail = useCallback(
    async (refresh = false) => {
      const slugToFetch = list?.slug ?? slugParam
      const uuidToFetch = list?.uuid ?? uuid
      if (!slugToFetch && !uuidToFetch) return

      if (refresh) {
        setRefreshing(true)
      } else if (!fetched) {
        setLoading(true)
      }

      try {
        const detail = slugToFetch
          ? await getListBySlug(slugToFetch)
          : await getListByUuid(uuidToFetch!)
        setList(detail)
        setFetched(true)
        navigation.setOptions({ title: detail.title })
      } catch {
        if (!refresh && !fetched) {
          setList(null)
        }
        toast.error(listDetailLoadError)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [slugParam, uuid, fetched, list?.slug, list?.uuid, navigation],
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

  useEffect(() => {
    if (addOverlayWasOpenRef.current && !addOverlayOpen && fetched) {
      void fetchDetail(true)
    }
    addOverlayWasOpenRef.current = addOverlayOpen
  }, [addOverlayOpen, fetched, fetchDetail])

  // Refresh detail when returning from add-restaurant screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (fetched) void fetchDetail(true)
    })
    return unsubscribe
  }, [navigation, fetched, fetchDetail])

  const isListOwner =
    Boolean(list?.owner_id) && Boolean(user?.id) && list?.owner_id === user?.id
  const { openContentActions } = useModeration()

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
    const message = isListOwner
      ? `Check out my restaurant list: ${list.title}`
      : `Check out this restaurant list: ${list.title}`
    if (shareToken) {
      void Share.share({ url: `${SHARE_BASE}/${shareToken}`, message })
    } else {
      void Share.share({ url: `https://tastyplates.co/lists/${list.slug}`, message })
    }
  }, [isListOwner, list])

  const handleDelete = useCallback(() => {
    if (!list) return
    Alert.alert(
      `Delete “${list.title}”?`,
      `The list and its ${list.items.length} ${list.items.length === 1 ? 'restaurant' : 'restaurants'} will be removed. The restaurants themselves stay saved anywhere else you added them.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete list',
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

  const openAddRestaurantHandler = useCallback(() => {
    if (!uuid) return
    openAddRestaurant({
      listUuid: uuid,
      listTitle: list?.title ?? titleParam ?? undefined,
    })
  }, [uuid, list?.title, titleParam, openAddRestaurant])

  // A custom photo always wins; otherwise the generated cover tracks the item count (design L3).
  const coverUri = list?.display_pic?.trim() || (!list ? displayPicParam?.trim() : '') || null

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
            readOnly={!isListOwner}
            onRemove={(i) => void handleRemoveItem(i)}
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Spotify-style centered list artwork */}
            <View className="items-center px-4 pt-6 pb-2">
              <View
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <ListCover
                  title={list?.title ?? titleParam ?? ''}
                  count={itemCount}
                  imageUrl={coverUri}
                  seed={uuid ?? list?.uuid ?? 'list'}
                  size={200}
                />
              </View>
            </View>

            <View className="items-center px-6" style={{ gap: 6, paddingBottom: 6 }}>
              <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 50, backgroundColor: SURFACE_FOG }}>
                <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 11, color: TEXT_MUTED_LIST }}>{visibilityLabel}</Text>
              </View>
              <Text accessibilityRole="header" className="text-center" style={{ fontFamily: FONT.heading, fontSize: 26, lineHeight: 31, color: TEXT_HEADING_LIST }}>
                {list?.title ?? titleParam ?? ''}
              </Text>
            </View>

            {/* List metadata header */}
            <View className="border-b border-gray-100 px-4 pt-2 pb-3">
              {list?.description ? (
                <Text className="text-sm text-[#6b7280] font-body" numberOfLines={3}>
                  {list.description}
                </Text>
              ) : null}
              <Text className={`text-xs text-[#9ca3af] font-body${list?.description ? ' mt-2' : ''}`}>
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
                  <Text className="text-sm text-[#374151] font-body">Share</Text>
                </Pressable>

                {list && !isListOwner ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Report or block"
                    onPress={() =>
                      openContentActions({
                        targetType: 'list',
                        targetId: list.uuid,
                        ownerId: list.owner_id,
                        onBlocked: () => router.back(),
                      })
                    }
                    className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
                  >
                    <AppIcon name="flag" size={14} color="#374151" />
                    <Text className="text-sm text-[#374151] font-body">Report</Text>
                  </Pressable>
                ) : null}

                {isListOwner && !list?.is_public ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handleMakePublic()}
                    disabled={makingPublic}
                    className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
                  >
                    <AppIcon name="globe" size={14} color="#374151" />
                    <Text className="text-sm text-[#374151] font-body">
                      {makingPublic ? 'Saving…' : 'Make public'}
                    </Text>
                  </Pressable>
                ) : null}

                {isListOwner ? (
                  <>
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
                            display_pic:
                              list.display_pic?.trim() || list.cover_image_url?.trim() || '',
                          },
                        })
                      }}
                      className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white px-4 py-2"
                    >
                      <AppIcon name="edit-2" size={14} color="#374151" />
                      <Text className="text-sm text-[#374151] font-body">Edit</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleDelete}
                      className="flex-row items-center gap-2 rounded-[50px] border border-red-200 bg-white px-4 py-2"
                    >
                      <AppIcon name="trash-2" size={14} color="#ef4444" />
                      <Text className="text-sm text-red-500 font-body">Delete</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>

            {isListOwner ? <ManageListAddRestaurantRow onPress={openAddRestaurantHandler} /> : null}
          </View>
        }
        ListEmptyComponent={
          isEmpty ? (
            <ListDetailEmptyState
              readOnly={!isListOwner}
              onAddRestaurant={isListOwner ? openAddRestaurantHandler : undefined}
            />
          ) : null
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
