/**
 * Optional REST bridge to the Next.js site APIs (same contract as tastyplates-v2-1).
 * Set `EXPO_PUBLIC_WEB_API_URL` to your deployed web origin, e.g. `https://example.com`
 * (no trailing slash). If unset, home sections that depend on HTTP stay empty.
 */
export function getWebApiBase(): string {
  return (process.env.EXPO_PUBLIC_WEB_API_URL ?? '').replace(/\/$/, '')
}

export interface FeaturedRestaurantApi {
  id: number
  restaurant: {
    id: number
    slug: string
    title: string
    featured_image_url: string | null
    listing_street: string | null
    address: {
      city?: string
      country_short?: string
      street_address?: string
    } | null
    average_rating: number | null
    ratings_count: number | null
  }
}

export interface ArticleApi {
  id: string | number
  slug?: string | null
  title: string
  cover_image_url?: string | null
  featured_image_alt?: string | null
  category?: string | null
  reading_time_minutes?: number | null
}

function displayAddress(
  listingStreet: string | null | undefined,
  address: FeaturedRestaurantApi['restaurant']['address'],
): string | null {
  if (listingStreet?.trim()) return listingStreet.trim()
  if (address?.street_address?.trim()) return address.street_address.trim()
  if (address?.city) {
    return address.country_short ? `${address.city}, ${address.country_short}` : address.city
  }
  return null
}

export async function fetchFeaturedRestaurants(): Promise<FeaturedRestaurantApi[]> {
  const base = getWebApiBase()
  if (!base) return []
  try {
    const res = await fetch(`${base}/api/v1/featured-restaurants`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { success?: boolean; data?: FeaturedRestaurantApi[] }
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data.filter((row) => row.restaurant)
  } catch {
    return []
  }
}

export async function fetchArticles(locationSlug: string, limit = 8): Promise<ArticleApi[]> {
  const base = getWebApiBase()
  if (!base) return []
  try {
    const params = new URLSearchParams({ limit: String(limit), location_slug: locationSlug })
    const res = await fetch(`${base}/api/v1/articles/get-articles?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { success?: boolean; data?: ArticleApi[] }
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data
  } catch {
    return []
  }
}

export { displayAddress as formatFeaturedRestaurantAddress }
