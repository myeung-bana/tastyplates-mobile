import type { Router } from 'expo-router'

import {
  SCREEN_PLACES_GOOGLE_DETAIL,
  SCREEN_RESTAURANT_DETAIL,
  SCREEN_RESTAURANTS,
} from '@/constants/screens'
import type { RecentSearch } from '@/lib/recentSearches'

/** Keyword → Explore `listing`; cuisine / category → Explore filtered; restaurant → its page. */
export function openRecentSearch(router: Pick<Router, 'navigate' | 'push'>, recent: RecentSearch): void {
  const value = recent.value?.trim()
  switch (recent.kind) {
    case 'cuisine':
      router.navigate({ pathname: SCREEN_RESTAURANTS, params: { cuisine: value || recent.query } })
      return
    case 'category':
      router.navigate({ pathname: SCREEN_RESTAURANTS, params: { category: value || recent.query } })
      return
    case 'restaurant':
      if (value?.startsWith('google:')) {
        router.push({ pathname: SCREEN_PLACES_GOOGLE_DETAIL, params: { place_id: value.slice(7) } })
      } else if (value) {
        router.push({ pathname: SCREEN_RESTAURANT_DETAIL, params: { slug: value } })
      }
      return
    default:
      router.navigate({ pathname: SCREEN_RESTAURANTS, params: { listing: recent.query } })
  }
}
