import { useRef } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Swipeable } from 'react-native-gesture-handler'
import { router } from 'expo-router'
import { AppIcon } from '@/components/ui/AppIcon'

import { STAR_FILLED } from '@/constants/images'
import { restaurantDetailPath } from '@/constants/screens'
import { castHref } from '@/lib/routeParams'
import type { MyListRestaurant } from '@/lib/myListsRestaurant'
import { getBestRestaurantAddress } from '@/utils/addressUtils'

interface Props {
  restaurant: MyListRestaurant
  swipeableRefs: React.MutableRefObject<Map<string, Swipeable>>
  onRemove: (restaurant: MyListRestaurant) => void
}

const StarIcon = STAR_FILLED

export function MyListsRestaurantRow({ restaurant, swipeableRefs, onRemove }: Props): JSX.Element {
  const swipeRef = useRef<Swipeable>(null)

  const address = getBestRestaurantAddress(
    restaurant.googleMapUrl,
    restaurant.listingStreet,
  )

  const ratingDisplay =
    restaurant.averageRating != null && restaurant.averageRating > 0
      ? restaurant.averageRating.toFixed(1)
      : '—'

  function renderRightActions() {
    return (
      <View
        style={{ width: 80, flex: 1 }}
        className="items-center justify-center bg-red-500"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove restaurant"
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
            swipeRef.current?.close()
            onRemove(restaurant)
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
          swipeableRefs.current.set(restaurant.slug, ref)
        } else {
          swipeableRefs.current.delete(restaurant.slug)
        }
      }}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        swipeableRefs.current.forEach((s, key) => {
          if (key !== restaurant.slug) s.close()
        })
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          router.push(castHref(restaurantDetailPath(restaurant.slug)))
        }}
        className="flex-row items-center gap-3 border-b border-gray-50 bg-white px-4 py-3"
      >
        {/* Thumbnail */}
        <View className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
          <Image
            source={{ uri: restaurant.image }}
            style={{ width: 56, height: 56, borderRadius: 10 }}
            resizeMode="cover"
          />
        </View>

        {/* Centre */}
        <View className="min-w-0 flex-1" style={{ gap: 2 }}>
          <Text
            className="font-neusans text-[15px] font-medium text-[#31343F]"
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
          {address ? (
            <Text
              className="font-neusans text-[13px] text-[#6b7280]"
              numberOfLines={1}
            >
              {address}
            </Text>
          ) : null}
          {restaurant.listingCategories.length > 0 ? (
            <View className="mt-0.5 flex-row flex-wrap gap-1">
              {restaurant.listingCategories.slice(0, 2).map((cat) => (
                <View key={cat.slug} className="rounded-full bg-[#ff7c0a] px-2 py-0.5">
                  <Text className="font-neusans text-[10px] text-white">{cat.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Right — rating + chevron */}
        <View className="flex-shrink-0 items-end" style={{ gap: 2 }}>
          <View className="flex-row items-center gap-1">
            <StarIcon width={12} height={12} />
            <Text className="font-neusans text-[13px] text-[#31343F]">{ratingDisplay}</Text>
          </View>
          <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
        </View>
      </Pressable>
    </Swipeable>
  )
}
