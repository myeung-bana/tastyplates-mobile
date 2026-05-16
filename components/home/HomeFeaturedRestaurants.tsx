import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import {
  fetchFeaturedRestaurants,
  type FeaturedRestaurantApi,
} from '@/lib/homeContentApi'
import { formatRestaurantListSubtitle } from '@/services/restaurantsV2Service'
import { RestaurantBrowseCard } from '@/components/restaurant/RestaurantBrowseCard'
import { BRAND_PRIMARY } from '@/constants/brand'

const CARD_W = 148
const CARD_H = Math.round((CARD_W * 4) / 3)

export function HomeFeaturedRestaurants() {
  const [items, setItems] = useState<FeaturedRestaurantApi[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchFeaturedRestaurants()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (!loading && items.length === 0) return null

  return (
    <View className="mt-2 w-full">
      <Text className="mb-3 px-4 text-center text-lg font-semibold text-gray-900">Featured restaurants</Text>
      {loading ? (
        <View className="items-center justify-center py-12" style={{ minHeight: 200 }}>
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
          {items.map((row) => {
            const r = row.restaurant
            const subtitle = formatRestaurantListSubtitle(r.listing_street, r.address)
            return (
              <RestaurantBrowseCard
                key={row.id}
                variant="carousel"
                title={r.title}
                imageUrl={r.featured_image_url}
                subtitle={subtitle}
                rating={r.average_rating}
                reviewCount={r.ratings_count ?? undefined}
                containerStyle={{ width: CARD_W, height: CARD_H }}
                onPress={() =>
                  router.push({
                    pathname: '/restaurants/[slug]',
                    params: { slug: r.slug },
                  })
                }
              />
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
