import { useRef } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Swipeable } from 'react-native-gesture-handler'
import { router } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { castHref } from '@/lib/routeParams'
import { studioManageListDetailPath } from '@/constants/screens'
import type { RestaurantListSummary } from '@/types/restaurantList'

interface Props {
  list: RestaurantListSummary
  swipeableRefs: React.MutableRefObject<Map<string, Swipeable>>
  onDelete: (list: RestaurantListSummary) => void
}

export function ManageListRow({ list, swipeableRefs, onDelete }: Props): JSX.Element {
  const swipeRef = useRef<Swipeable>(null)

  const coverUri = list.display_pic?.trim() || null
  const count = typeof list.items_count === 'number' ? list.items_count : 0
  const restaurantLabel = `${count} ${count === 1 ? 'restaurant' : 'restaurants'}`
  const visibilityLabel = list.is_public ? 'Public' : 'Private'
  const subtitle = `${restaurantLabel} · ${visibilityLabel}`

  function renderRightActions(): JSX.Element {
    return (
      <View style={{ width: 80, flex: 1 }} className="items-center justify-center bg-red-500">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete list"
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            swipeRef.current?.close()
            onDelete(list)
          }}
          className="h-full w-full items-center justify-center gap-1.5"
        >
          <AppIcon name="trash-2" size={22} color="white" />
          <Text className="font-neusans text-[11px] font-medium text-white">Delete</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          swipeableRefs.current.set(list.uuid, ref)
        } else {
          swipeableRefs.current.delete(list.uuid)
        }
      }}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        swipeableRefs.current.forEach((s, key) => {
          if (key !== list.uuid) s.close()
        })
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          router.push({
            pathname: castHref(studioManageListDetailPath(list.uuid)) as never,
            params: {
              slug: list.slug,
              title: list.title,
              display_pic: list.display_pic?.trim() || list.cover_image_url?.trim() || '',
            },
          })
        }}
        className="flex-row items-center gap-3 border-b border-gray-50 bg-white px-4 py-3"
      >
        {/* Cover tile */}
        <View className="h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={{ width: 56, height: 56, borderRadius: 10 }}
              resizeMode="cover"
            />
          ) : (
            <AppIcon name="map-pin" size={24} color="#9ca3af" />
          )}
        </View>

        {/* Info */}
        <View className="min-w-0 flex-1" style={{ gap: 2 }}>
          <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
            {list.title}
          </Text>
          <Text className="font-neusans text-[13px] text-[#6b7280]" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* Chevron */}
        <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
      </Pressable>
    </Swipeable>
  )
}
