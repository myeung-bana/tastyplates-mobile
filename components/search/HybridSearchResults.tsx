import { useLocation } from '@/contexts/LocationContext'
import { RestaurantDiscoveryResults } from '@/components/restaurant-search/RestaurantDiscoveryResults'
import { useRestaurantDiscoverySearch } from '@/hooks/useRestaurantDiscoverySearch'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

interface HybridSearchResultsProps {
  keyword: string
  onSelect: (result: RestaurantSearchResult) => void
}

export function HybridSearchResults({ keyword, onSelect }: HybridSearchResultsProps) {
  const { location } = useLocation()
  const { results, loading, errors } = useRestaurantDiscoverySearch({
    query: keyword,
    location,
    mode: 'preview',
    enabled: keyword.trim().length >= 2,
  })

  return (
    <RestaurantDiscoveryResults
      keyword={keyword.trim()}
      variant="navigate"
      loading={loading}
      results={results}
      errors={errors}
      onSelect={onSelect}
    />
  )
}
