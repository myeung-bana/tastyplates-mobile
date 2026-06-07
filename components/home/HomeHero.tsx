import { View, Text, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '@/components/ui/AppIcon'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'

/**
 * Hero: subtitle + tap-to-open full-screen search overlay.
 */
export function HomeHero() {
  const { openSearch } = useSearchOverlay()

  return (
    <View className="overflow-hidden bg-white">
      <View className="px-4 pb-6 pt-0">
        <Text className="text-center text-sm leading-snug text-gray-600">
          Dine like a Brazilian in Tokyo — or Korean in New York?
        </Text>

        <Pressable
          onPress={() => {
            void Haptics.selectionAsync()
            openSearch()
          }}
          accessibilityRole="button"
          accessibilityLabel="Search restaurants"
          className="mt-4 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 shadow-sm shadow-black/5 active:opacity-80"
        >
          <AppIcon name="search" size={18} color="#9ca3af" />
          <Text className="flex-1 font-neusans text-[15px] text-gray-400">
            Search restaurants or palate...
          </Text>
          <AppIcon name="sliders" size={18} color="#9ca3af" />
        </Pressable>
      </View>
    </View>
  )
}
