import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Image, Pressable, Text, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { router } from 'expo-router'

import { BORDER_SUBTLE, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import type { MyListPlaceRow } from '@/hooks/useMyList'
import { googlePlaceDetailPath, restaurantDetailPath } from '@/constants/screens'
import { castHref } from '@/lib/routeParams'

interface MyListPlaceCardProps {
  row: MyListPlaceRow
  onRemove: (id: string) => Promise<void>
}

export function MyListPlaceCard({ row, onRemove }: MyListPlaceCardProps): JSX.Element {
  const subtitle = row.address ?? row.location_label ?? null

  const slug = row.tastyplates_restaurant_slug?.trim()
  const openTarget = slug
    ? () => router.push(castHref(restaurantDetailPath(slug)))
    : () => router.push(castHref(googlePlaceDetailPath(row.google_place_id)))

  const trailingActions = (): JSX.Element => (
    <View className="mb-3 justify-center pl-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove place from list"
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          void onRemove(row.id)
        }}
        className="h-full items-center justify-center rounded-2xl bg-red-600 px-5 py-6 active:bg-red-700"
      >
        <Ionicons name="trash-outline" color="#ffffff" size={22} />
        <Text className="mt-1 text-[11px] font-semibold text-white">Remove</Text>
      </Pressable>
    </View>
  )

  return (
    <Swipeable renderRightActions={trailingActions} overshootRight={false}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync()
          openTarget()
        }}
        className="mb-3 flex-row overflow-hidden rounded-2xl border bg-white px-4 py-3 active:bg-gray-50"
        style={{ borderColor: BORDER_SUBTLE }}
      >
        {row.image_url ? (
          <Image
            source={{ uri: row.image_url }}
            className="mr-4 h-16 w-16 rounded-xl bg-gray-100"
          />
        ) : (
          <View className="mr-4 h-16 w-16 items-center justify-center rounded-xl bg-gray-50">
            <Ionicons name="restaurant-outline" size={24} color={TEXT_MUTED} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: TEXT_HEADING }} numberOfLines={2}>
            {row.name}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-xs leading-snug" style={{ color: TEXT_MUTED }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {slug ? (
            <Text className="mt-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
              On TastyPlates — tap for listing
            </Text>
          ) : (
            <Text className="mt-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
              Google Place — stub detail or open Maps
            </Text>
          )}
        </View>
        <Ionicons style={{ alignSelf: 'center' }} name="chevron-forward" size={18} color={TEXT_MUTED} />
      </Pressable>
    </Swipeable>
  )
}
