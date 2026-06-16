import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { AppIcon } from '@/components/ui/AppIcon'

import type { ProfilePublicListSummary } from '@/services/profileUserListsService'

type Props = {
  list: ProfilePublicListSummary
  onPress: () => void
}

export function ProfilePublicListRow({ list, onPress }: Props): JSX.Element {
  const coverUri = list.display_pic?.trim() || list.cover_image_url?.trim() || null
  const count = typeof list.items_count === 'number' ? list.items_count : 0
  const restaurantLabel = `${count} ${count === 1 ? 'restaurant' : 'restaurants'}`

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      className="flex-row items-center gap-3 border-b border-gray-50 py-3 active:opacity-90"
    >
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

      <View className="min-w-0 flex-1" style={{ gap: 2 }}>
        <Text className="font-neusans text-[15px] font-medium text-[#31343F]" numberOfLines={1}>
          {list.title}
        </Text>
        <Text className="font-neusans text-[13px] text-[#6b7280]" numberOfLines={1}>
          {restaurantLabel} · Public
        </Text>
      </View>

      <AppIcon name="chevron-right" size={14} color="#e5e7eb" />
    </Pressable>
  )
}
