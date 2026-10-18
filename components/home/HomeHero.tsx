import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'

import { AppIcon } from '@/components/ui/AppIcon'
import { BORDER_SUBTLE, SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { useLocation } from '@/contexts/LocationContext'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { useRecentSearches } from '@/hooks/useRecentSearches'
import { openRecentSearch } from '@/lib/openRecentSearch'
import { recentKindLabel } from '@/lib/recentSearches'

/** Uber-style: only the two most recent searches sit under the field. */
const HOME_RECENT_LIMIT = 2

type HomeHeroProps = {
  /** Bumped by the home screen on focus to reload recent searches. */
  recentRefreshKey?: number
}

/** Home hero (design H1): headline, search pill (opens S1), two recent searches. */
export function HomeHero({ recentRefreshKey = 0 }: HomeHeroProps) {
  const router = useRouter()
  const { openSearch } = useSearchOverlay()
  const { location } = useLocation()
  const { recents, refresh } = useRecentSearches()

  useEffect(() => {
    void refresh()
  }, [refresh, recentRefreshKey])

  const recentOnHome = recents.slice(0, HOME_RECENT_LIMIT)

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 16 }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: FONT.heading, fontSize: 28, lineHeight: 32, letterSpacing: -0.4, color: TEXT_HEADING }}
      >
        Dine like a Brazilian in Tokyo — or Korean in New York?
      </Text>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync()
          openSearch()
        }}
        accessibilityRole="search"
        accessibilityLabel="Search a cuisine or restaurant"
        className="flex-row items-center active:opacity-80"
        style={{ height: 56, borderRadius: 999, backgroundColor: SURFACE_FOG, paddingHorizontal: 20, gap: 12 }}
      >
        <AppIcon name="search" size={20} color={TEXT_HEADING} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.bodySemibold, fontSize: 18, color: TEXT_HEADING }}>
          Search a cuisine or restaurant
        </Text>
      </Pressable>

      {recentOnHome.length > 0 ? (
        <View style={{ marginTop: -4 }}>
          {recentOnHome.map((recent, index) => (
            <Pressable
              key={`${recent.kind ?? 'keyword'}:${recent.query}`}
              accessibilityRole="button"
              accessibilityLabel={`${recent.query}, ${recentKindLabel(recent.kind)}`}
              onPress={() => {
                void Haptics.selectionAsync()
                openRecentSearch(router, recent)
              }}
              className="flex-row items-center active:opacity-70"
              style={{ gap: 14, paddingVertical: 12 }}
            >
              <View className="items-center justify-center" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: SURFACE_FOG }}>
                <AppIcon name="clock" size={17} color={TEXT_HEADING} />
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  gap: 4,
                  paddingBottom: 12,
                  marginBottom: -12,
                  borderBottomWidth: index < recentOnHome.length - 1 ? 1 : 0,
                  borderBottomColor: BORDER_SUBTLE,
                }}
              >
                <Text numberOfLines={1} style={{ fontFamily: FONT.bodySemibold, fontSize: 16, color: TEXT_HEADING }}>
                  {recent.query}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 13, color: TEXT_MUTED }}>
                  {recentKindLabel(recent.kind)} · {location.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
