import { useRef } from 'react'
import { Image, Linking, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Swipeable } from 'react-native-gesture-handler'
import { router } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { DEFAULT_RESTAURANT_IMAGE } from '@/constants/images'
import { castHref } from '@/lib/routeParams'
import { restaurantDetailPath } from '@/constants/screens'
import { isLinkedItem, getItemDisplayName } from '@/types/restaurantList'
import type { RestaurantListItem } from '@/types/restaurantList'

interface Props {
  item: RestaurantListItem
  swipeableRefs: React.MutableRefObject<Map<string, Swipeable>>
  onRemove: (item: RestaurantListItem) => void
}

export function ManageListItemRow({ item, swipeableRefs, onRemove }: Props): JSX.Element {
  const swipeRef = useRef<Swipeable>(null)
  const rowKey = String(item.id)
  const linked = isLinkedItem(item)
  const displayName = getItemDisplayName(item)

  function handlePress(): void {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (linked && item.slug) {
      router.push(castHref(restaurantDetailPath(item.slug)))
    } else if (item.google_place_id) {
      void Linking.openURL(
        `https://www.google.com/maps/place/?q=place_id:${item.google_place_id}`,
      )
    }
  }

  function renderRightActions(): JSX.Element {
    return (
      <View style={{ width: 80, flex: 1 }} className="items-center justify-center bg-red-500">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove from list"
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            swipeRef.current?.close()
            onRemove(item)
          }}
          className="h-full w-full items-center justify-center gap-1.5"
        >
          <AppIcon name="trash-2" size={22} color="white" />
          <Text className="font-neusans text-[11px] font-medium text-white">Remove</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          swipeableRefs.current.set(rowKey, ref)
        } else {
          swipeableRefs.current.delete(rowKey)
        }
      }}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        swipeableRefs.current.forEach((s, key) => {
          if (key !== rowKey) s.close()
        })
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        className="flex-row items-center gap-3 border-b border-gray-50 bg-white px-4 py-3"
      >
        {/* Cover */}
        <View className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
          <Image
            source={{ uri: item.image_url ?? DEFAULT_RESTAURANT_IMAGE }}
            style={{ width: 56, height: 56, borderRadius: 10 }}
            resizeMode="cover"
          />
        </View>

        {/* Info */}
        <View className="min-w-0 flex-1" style={{ gap: 2 }}>
          <Text
            className="font-neusans text-[15px] font-medium text-[#31343F]"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {item.address ? (
            <Text className="font-neusans text-[13px] text-[#6b7280]" numberOfLines={1}>
              {item.address}
            </Text>
          ) : null}
          {!linked ? (
            <View className="mt-0.5 self-start rounded-full bg-gray-100 px-2 py-0.5">
              <Text className="font-neusans text-[10px] text-[#9ca3af]">Google Places</Text>
            </View>
          ) : null}
        </View>

        {/* Chevron */}
        <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
      </Pressable>
    </Swipeable>
  )
}
