import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native'

import {
  RestaurantBrowseCardItem,
  getHomeCarouselRestaurantCardWidth,
  getRestaurantBrowseCardWidth,
  restaurantBrowseCardItemFromFeatured,
} from '@/components/restaurant/RestaurantBrowseCardItem'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import {
  fetchFeaturedRestaurants,
  type FeaturedRestaurantApi,
} from '@/lib/homeContentApi'

export interface RecommendedRestaurantsCarouselProps {
  /** Section title (`design_system` §3.3). */
  heading?: string
  /** Muted line under title. */
  subheading?: string
  /** Visually separate from prose above (article detail). */
  withTopDivider?: boolean
  /**
   * `carousel` — home row (horizontal scroll).  
   * `list` — single column full-width cards (e.g. article detail; scrolls with parent).
   */
  layout?: 'carousel' | 'list'
  /** Extra root classes (NativeWind). */
  className?: string
  /** When set, skips `fetchFeaturedRestaurants` (e.g. article `article_restaurant_associations`). */
  staticItems?: FeaturedRestaurantApi[]
  /** Filter featured restaurants to the selected city/country location key. */
  locationKey?: string
  /** When true, title/subheading render in a parent {@link HomeSectionCard}. */
  hideSectionHeader?: boolean
}

/**
 * Global featured / recommended picks — same source as home (`recommend-articles.md`).
 * Uses {@link RestaurantBrowseCardItem} (same tile as Restaurants tab).
 */
export function RecommendedRestaurantsCarousel({
  heading = 'Recommended',
  subheading = 'Hand-picked spots for you',
  withTopDivider = false,
  layout = 'carousel',
  className,
  staticItems,
  locationKey,
  hideSectionHeader = false,
}: RecommendedRestaurantsCarouselProps) {
  const { width: screenWidth } = useWindowDimensions()
  /** Home feed only (`hideSectionHeader`) — carousel cards are 15% narrower for a right-edge peek. */
  const cardWidth = useMemo(() => {
    if (screenWidth <= 0) return undefined
    if (hideSectionHeader) return getHomeCarouselRestaurantCardWidth(screenWidth)
    return getRestaurantBrowseCardWidth(screenWidth)
  }, [screenWidth, hideSectionHeader])

  const useRemote = staticItems === undefined
  const [items, setItems] = useState<FeaturedRestaurantApi[]>(() => (useRemote ? [] : staticItems))
  const [loading, setLoading] = useState(() => useRemote)

  const load = useCallback(async (locKey?: string) => {
    setLoading(true)
    const data = await fetchFeaturedRestaurants(locKey)
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (staticItems !== undefined) {
      setItems(staticItems)
      setLoading(false)
      return
    }
    void load(locationKey)
  }, [load, staticItems, locationKey])

  if (!loading && items.length === 0) return null

  const cardNodes = items.map((row) => (
    <RestaurantBrowseCardItem
      key={row.id}
      {...restaurantBrowseCardItemFromFeatured(row)}
      containerStyle={layout === 'carousel' ? { width: cardWidth } : undefined}
    />
  ))

  return (
    <View
      className={`w-full ${hideSectionHeader ? '' : 'bg-white px-0 pt-2'} ${className ?? ''}`}
      style={
        withTopDivider && !hideSectionHeader
          ? { borderTopWidth: 1, borderTopColor: BORDER_SUBTLE, marginTop: 8, paddingTop: 20 }
          : undefined
      }
    >
      {!hideSectionHeader ? (
        <View
          className="items-center px-4 pb-3"
          style={{ borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }}
        >
          <Text className="mb-1 text-lg font-normal" style={{ color: TEXT_HEADING }}>
            {heading}
          </Text>
          <Text className="text-center text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
            {subheading}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="items-center justify-center py-12" style={{ minHeight: 220 }}>
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : layout === 'list' ? (
        <View className="px-5 pt-4 pb-2" style={{ gap: 12 }}>
          {cardNodes}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: hideSectionHeader ? 0 : 16,
            paddingTop: hideSectionHeader ? 0 : 16,
            gap: 12,
            paddingBottom: 8,
          }}
        >
          {cardNodes}
        </ScrollView>
      )}
    </View>
  )
}
