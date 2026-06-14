/**
 * Home feed content: optional Next.js web APIs + **Nhost Functions fallback** (same data as staging).
 *
 * Env:
 * - `EXPO_PUBLIC_WEB_API_URL` — Next site API (`/api/v1/featured-restaurants`, `/api/v1/articles/...`).
 * - `EXPO_PUBLIC_NHOST_FUNCTIONS_URL` — used when web API missing or returns no rows (via `tastyplatesFetch`).
 */
import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { FeaturedRestaurantApi } from '@/types/featuredRestaurant'

export type { FeaturedRestaurantApi } from '@/types/featuredRestaurant'

export function getWebApiBase(): string {
  return (process.env.EXPO_PUBLIC_WEB_API_URL ?? '').replace(/\/$/, '')
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

/** Hasura-backed `featured-restaurants` function response row. */
interface NhostFeaturedRow {
  id: number
  restaurant_id?: number
  sort_order?: number
  restaurant: {
    id: number
    title: string
    slug: string
    featured_image_url: string | null
    listing_street: string | null
    address: unknown
    average_rating: number | null
    ratings_count: number | null
    cuisines?: unknown
    categories?: unknown
  }
}

interface NhostArticlesPayload {
  articles: Array<{
    id: string | number
    slug?: string | null
    title: string
    category?: string | null
    featured_image_url?: string | null
    featured_image_alt?: string | null
    reading_time_minutes?: number | null
  }>
  meta: { limit: number; offset: number; hasMore: boolean }
}

/** Maps Hasura `address` JSON to subtitle-friendly fields (shared with article-linked restaurants). */
export function normalizeRestaurantAddressJson(
  raw: unknown,
): FeaturedRestaurantApi['restaurant']['address'] | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const city = typeof o.city === 'string' ? o.city : undefined
  const country_short = typeof o.country_short === 'string' ? o.country_short : undefined
  const street_address = typeof o.street_address === 'string' ? o.street_address : undefined
  if (!city && !country_short && !street_address) return null
  return { city, country_short, street_address }
}

function mapNhostFeaturedRows(rows: NhostFeaturedRow[]): FeaturedRestaurantApi[] {
  return rows
    .filter((r) => r?.restaurant?.slug)
    .map((r) => ({
      id: r.id,
      restaurant: {
        id: r.restaurant.id,
        slug: r.restaurant.slug,
        title: r.restaurant.title,
        featured_image_url: r.restaurant.featured_image_url,
        listing_street: r.restaurant.listing_street,
        address: normalizeRestaurantAddressJson(r.restaurant.address),
        average_rating: r.restaurant.average_rating,
        ratings_count: r.restaurant.ratings_count,
        cuisines: r.restaurant.cuisines,
        categories: r.restaurant.categories,
      },
    }))
}

async function fetchFeaturedRestaurantsNhost(locationSlug?: string): Promise<FeaturedRestaurantApi[]> {
  const q = locationSlug?.trim() ? `?location_slug=${encodeURIComponent(locationSlug.trim())}` : ''
  const envelope = await tastyplatesFetch<NhostFeaturedRow[]>(`featured-restaurants${q}`)
  if (!envelope.ok) return []
  try {
    const rows = unwrapEnvelope(envelope)
    if (!Array.isArray(rows)) return []
    return mapNhostFeaturedRows(rows)
  } catch {
    return []
  }
}

function mapNhostArticleRows(
  rows: NhostArticlesPayload['articles'],
): ArticleApi[] {
  return rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    cover_image_url: a.featured_image_url ?? null,
    featured_image_alt: a.featured_image_alt ?? null,
    category: a.category ?? null,
    reading_time_minutes: a.reading_time_minutes ?? null,
  }))
}

export type ArticlesPageResult = {
  articles: ArticleApi[]
  hasMore: boolean
}

async function fetchArticlesPageNhost(
  locationSlug: string,
  limit: number,
  offset: number,
): Promise<ArticlesPageResult> {
  const q = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (locationSlug.trim()) q.set('location_slug', locationSlug.trim())
  const envelope = await tastyplatesFetch<NhostArticlesPayload>(
    `articles/get-articles?${q.toString()}`,
  )
  if (!envelope.ok) return { articles: [], hasMore: false }
  try {
    const { articles, meta } = unwrapEnvelope(envelope)
    return {
      articles: mapNhostArticleRows(articles),
      hasMore: meta?.hasMore ?? false,
    }
  } catch {
    return { articles: [], hasMore: false }
  }
}

function normalizeWebArticle(raw: unknown): ArticleApi | null {
  if (raw == null || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const id = a.id
  if (id == null) return null
  const title = typeof a.title === 'string' ? a.title : null
  if (!title) return null
  const cover =
    (typeof a.cover_image_url === 'string' ? a.cover_image_url : null) ??
    (typeof a.featured_image_url === 'string' ? a.featured_image_url : null)
  return {
    id: id as string | number,
    slug: typeof a.slug === 'string' ? a.slug : null,
    title,
    cover_image_url: cover,
    featured_image_alt:
      typeof a.featured_image_alt === 'string' ? a.featured_image_alt : null,
    category: typeof a.category === 'string' ? a.category : null,
    reading_time_minutes: typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : null,
  }
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

export async function fetchFeaturedRestaurants(locationSlug?: string): Promise<FeaturedRestaurantApi[]> {
  const base = getWebApiBase()
  if (base) {
    try {
      const params = new URLSearchParams()
      if (locationSlug?.trim()) params.set('location_slug', locationSlug.trim())
      const query = params.toString()
      const url = `${base}/api/v1/featured-restaurants${query ? `?${query}` : ''}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const json = (await res.json()) as { success?: boolean; data?: FeaturedRestaurantApi[] }
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.filter((row) => row.restaurant)
        }
      }
    } catch {
      /* fall through to Nhost */
    }
  }
  return fetchFeaturedRestaurantsNhost(locationSlug)
}

export async function fetchArticlesPage(
  locationSlug: string,
  limit: number,
  offset: number,
): Promise<ArticlesPageResult> {
  const base = getWebApiBase()
  if (base) {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        location_slug: locationSlug,
      })
      const res = await fetch(`${base}/api/v1/articles/get-articles?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const json = (await res.json()) as {
          success?: boolean
          data?: unknown[] | { articles?: unknown[]; meta?: { hasMore?: boolean } }
        }
        if (json.success && json.data != null) {
          const rawList = Array.isArray(json.data)
            ? json.data
            : Array.isArray((json.data as { articles?: unknown[] }).articles)
              ? (json.data as { articles: unknown[] }).articles
              : []
          const out: ArticleApi[] = []
          for (const row of rawList) {
            const n = normalizeWebArticle(row)
            if (n) out.push(n)
          }
          if (out.length > 0) {
            const meta = !Array.isArray(json.data)
              ? (json.data as { meta?: { hasMore?: boolean } }).meta
              : undefined
            return {
              articles: out,
              hasMore: meta?.hasMore ?? out.length >= limit,
            }
          }
        }
      }
    } catch {
      /* Nhost fallback */
    }
  }

  let result = await fetchArticlesPageNhost(locationSlug, limit, offset)

  // Home preview used to fall back to unfiltered Nhost articles when the web API
  // missed; location-only queries can be empty while global articles exist.
  if (
    result.articles.length === 0 &&
    offset === 0 &&
    locationSlug.trim().length > 0
  ) {
    result = await fetchArticlesPageNhost('', limit, offset)
  }

  return result
}

export async function fetchArticles(locationSlug: string, limit = 8): Promise<ArticleApi[]> {
  const page = await fetchArticlesPage(locationSlug, limit, 0)
  return page.articles
}

export { displayAddress as formatFeaturedRestaurantAddress }
