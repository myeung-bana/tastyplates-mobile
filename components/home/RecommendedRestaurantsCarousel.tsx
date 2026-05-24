import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'

import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { SCREEN_RESTAURANT_DETAIL } from '@/constants/screens'
import {
  fetchFeaturedRestaurants,
  type FeaturedRestaurantApi,
} from '@/lib/homeContentApi'
import { formatRestaurantCardAddress } from '@/services/restaurantsV2Service'

const CARD_W = 148

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
 * `RestaurantBrowseCard` strip — `design_system.md` §5.3 Card.
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
        <View className="items-center justify-center py-12" style={{ minHeight: 160 }}>
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : layout === 'list' ? (
        <View className="px-5 pt-4 pb-2" style={{ gap: 12 }}>
          {items.map((row) => {
            const r = row.restaurant
            const subtitle = formatRestaurantCardAddress(r.listing_street, r.address)
            return (
              <RestaurantBrowseCard
                key={row.id}
                compact
                title={r.title}
                slug={r.slug?.trim() || undefined}
                imageUrl={r.featured_image_url}
                subtitle={subtitle}
                rating={r.average_rating}
                reviewCount={r.ratings_count ?? undefined}
                containerStyle={{ width: CARD_W }}
                onPress={() => {
                  const s = r.slug?.trim()
                  if (!s) return
                  router.push({
                    pathname: SCREEN_RESTAURANT_DETAIL,
                    params: { slug: s },
                  })
                }}
              />
            )
          })}
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
          {items.map((row) => {
            const r = row.restaurant
            const subtitle = formatRestaurantCardAddress(r.listing_street, r.address)
            return (
              <RestaurantBrowseCard
                key={row.id}
                compact
                title={r.title}
                slug={r.slug?.trim() || undefined}
                imageUrl={r.featured_image_url}
                subtitle={subtitle}
                rating={r.average_rating}
                reviewCount={r.ratings_count ?? undefined}
                containerStyle={{ width: CARD_W }}
                onPress={() => {
                  const s = r.slug?.trim()
                  if (!s) return
                  router.push({
                    pathname: SCREEN_RESTAURANT_DETAIL,
                    params: { slug: s },
                  })
                }}
              />
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
