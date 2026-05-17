import { RecommendedRestaurantsCarousel } from '@/components/home/RecommendedRestaurantsCarousel'

/**
 * Home hero row — global featured restaurants (`recommend-articles.md`).
 */
export function HomeFeaturedRestaurants() {
  return (
    <RecommendedRestaurantsCarousel
      className="mt-4"
      heading="Recommended"
      subheading="Hand-picked spots for you"
    />
  )
}
