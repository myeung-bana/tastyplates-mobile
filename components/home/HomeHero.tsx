import { useCallback, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

import { AppIcon } from '@/components/ui/AppIcon'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { useRecentSearches } from '@/hooks/useRecentSearches'

const HOME_RECENT_LIMIT = 2

type HomeHeroProps = {
  /** Bumped by the home screen on focus to reload recent searches. */
  recentRefreshKey?: number
}

/**
 * Hero: subtitle + tap-to-open full-screen search overlay.
 */
export function HomeHero({ recentRefreshKey = 0 }: HomeHeroProps) {
  const { openSearch } = useSearchOverlay()
  const { recents, refresh } = useRecentSearches()

  useEffect(() => {
    void refresh()
  }, [refresh, recentRefreshKey])

  const recentOnHome = recents.slice(0, HOME_RECENT_LIMIT)

  const runRecentSearch = useCallback((query: string) => {
    void Haptics.selectionAsync()
    router.navigate({
      pathname: SCREEN_RESTAURANTS,
      params: { listing: query.trim() },
    })
  }, [])

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
        </Pressable>

        {recentOnHome.length > 0 ? (
          <View className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-black/5">
            {recentOnHome.map((recent, index) => (
              <Pressable
                key={recent.query}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${recent.query}`}
                onPress={() => runRecentSearch(recent.query)}
                className={`flex-row items-center gap-3 px-3 py-3 active:bg-gray-50 ${
                  index < recentOnHome.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6]">
                  <AppIcon name="clock" size={18} color="#6b7280" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-neusans text-[15px] font-medium text-[#31343F]"
                    numberOfLines={1}
                  >
                    {recent.query}
                  </Text>
                  <Text className="mt-0.5 font-neusans text-xs text-gray-500">Recent search</Text>
                </View>
                <AppIcon name="chevron-right" size={18} color="#d1d5db" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  )
}
