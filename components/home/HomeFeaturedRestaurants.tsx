import { RecommendedRestaurantsCarousel } from '@/components/home/RecommendedRestaurantsCarousel'
import { HomeSectionCard } from '@/components/home/HomeSectionCard'
import { useLocation } from '@/contexts/LocationContext'

/**
 * Home hero row — global featured restaurants (`recommend-articles.md`).
 */
export function HomeFeaturedRestaurants() {
  const { location } = useLocation()

  return (
    <HomeSectionCard title="Recommended restaurants">
      <RecommendedRestaurantsCarousel
        hideSectionHeader
        locationKey={location.key}
      />
    </HomeSectionCard>
  )
}
