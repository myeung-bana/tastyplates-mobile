import { useMemo } from 'react'

import { useLocation } from '@/contexts/LocationContext'
import { RestaurantDiscoveryResults } from '@/components/restaurant-search/RestaurantDiscoveryResults'
import { useRestaurantDiscoverySearch } from '@/hooks/useRestaurantDiscoverySearch'
import { matchCategoryFromKeyword } from '@/lib/matchCategoryFromKeyword'
import { matchCuisineFromKeyword } from '@/lib/matchCuisineFromKeyword'
import type { RestaurantSearchResult } from '@/types/restaurantSearchResult'

interface HybridSearchResultsProps {
  keyword: string
  cuisineSlug?: string | null
  onSelect: (result: RestaurantSearchResult) => void
  onCuisineShortcutPress?: (slug: string, label: string) => void
  onCategoryShortcutPress?: (slug: string, label: string) => void
}

export function HybridSearchResults({
  keyword,
  cuisineSlug = null,
  onSelect,
  onCuisineShortcutPress,
  onCategoryShortcutPress,
}: HybridSearchResultsProps) {
  const { location } = useLocation()
  const trimmedKeyword = keyword.trim()
  const cuisineShortcut = useMemo(
    () => matchCuisineFromKeyword(trimmedKeyword),
    [trimmedKeyword],
  )
  const categoryShortcut = useMemo(
    () => matchCategoryFromKeyword(trimmedKeyword),
    [trimmedKeyword],
  )

  const { tpResults, googleResults, loading, errors } = useRestaurantDiscoverySearch({
    query: keyword,
    location,
    mode: 'preview',
    enabled: trimmedKeyword.length >= 2,
    cuisineSlug,
  })

  return (
    <RestaurantDiscoveryResults
      keyword={trimmedKeyword}
      variant="navigate"
      loading={loading}
      tpResults={tpResults}
      googleResults={googleResults}
      errors={errors}
      cuisineShortcut={cuisineShortcut}
      onCuisineShortcutPress={onCuisineShortcutPress}
      categoryShortcut={categoryShortcut}
      onCategoryShortcutPress={onCategoryShortcutPress}
      onSelect={onSelect}
    />
  )
}
