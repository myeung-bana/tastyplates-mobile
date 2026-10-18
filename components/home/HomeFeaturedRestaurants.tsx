import { router } from 'expo-router'

import { RecommendedRestaurantsCarousel } from '@/components/home/RecommendedRestaurantsCarousel'
import { SCREEN_RESTAURANTS } from '@/constants/screens'
import { HomeSectionCard } from '@/components/home/HomeSectionCard'
import { useLocation } from '@/contexts/LocationContext'

/**
 * Home hero row — global featured restaurants (`recommend-articles.md`).
 */
export function HomeFeaturedRestaurants() {
  const { location } = useLocation()

  return (
    <HomeSectionCard
      title="Recommended restaurants"
      contentBleed
      onSeeAll={() => router.navigate(SCREEN_RESTAURANTS)}
    >
      <RecommendedRestaurantsCarousel
        hideSectionHeader
        locationKey={location.key}
      />
    </HomeSectionCard>
  )
}
