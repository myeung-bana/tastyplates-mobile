import { DEFAULT_RESTAURANT_IMAGE } from '@/constants/images'
import type { HasuraGoogleMapUrl } from '@/utils/addressUtils'

export interface MyListCategory {
  id: number
  name: string
  slug: string
}

export interface MyListRestaurant {
  id: string
  slug: string
  name: string
  image: string
  listingStreet: string | null
  googleMapUrl: HasuraGoogleMapUrl | null
  listingCategories: MyListCategory[]
  averageRating: number | null
  ratingsCount: number | null
}

function parseJsonb<T>(value: unknown): T | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return value as T
}

function parseCategoryArray(raw: unknown): MyListCategory[] {
  const arr = parseJsonb<unknown[]>(raw)
  if (!Array.isArray(arr)) return []
  return arr
    .filter(Boolean)
    .map((c, i) => {
      if (typeof c === 'string') {
        return { id: i, name: c, slug: c.toLowerCase().replace(/\s+/g, '-') }
      }
      if (typeof c === 'object' && c !== null) {
        const obj = c as Record<string, unknown>
        const name = typeof obj.name === 'string' ? obj.name : (typeof obj.slug === 'string' ? obj.slug : String(obj))
        return {
          id: typeof obj.id === 'number' ? obj.id : i,
          name,
          slug: typeof obj.slug === 'string' ? obj.slug : name.toLowerCase().replace(/\s+/g, '-'),
        }
      }
      return null
    })
    .filter((c): c is MyListCategory => c !== null)
}

/** Shape of a restaurant row returned by `get-wishlist` / `get-checkins` Nhost functions. */
export interface HasuraRestaurantRow {
  id?: number | null
  uuid?: string | null
  title?: string | null
  slug?: string | null
  featured_image_url?: string | null
  listing_street?: string | null
  address?: unknown
  cuisines?: unknown
  categories?: unknown
  palates?: unknown
  average_rating?: number | null
  ratings_count?: number | null
  status?: string | null
}

export function mapHasuraRestaurantToListItem(row: HasuraRestaurantRow): MyListRestaurant {
  const googleMapUrl = parseJsonb<HasuraGoogleMapUrl>(row.address)

  const cuisineCategories = parseCategoryArray(row.cuisines)
  const regularCategories = parseCategoryArray(row.categories)
  const listingCategories = cuisineCategories.length > 0 ? cuisineCategories : regularCategories

  return {
    id: row.uuid ?? String(row.id ?? ''),
    slug: row.slug ?? '',
    name: row.title ?? 'Restaurant',
    image: row.featured_image_url ?? DEFAULT_RESTAURANT_IMAGE,
    listingStreet: row.listing_street ?? null,
    googleMapUrl,
    listingCategories,
    averageRating: typeof row.average_rating === 'number' ? row.average_rating : null,
    ratingsCount: typeof row.ratings_count === 'number' ? row.ratings_count : null,
  }
}

export function dedupeRestaurants(items: MyListRestaurant[]): MyListRestaurant[] {
  const seen = new Map<string, MyListRestaurant>()
  for (const item of items) {
    if (item.id && !seen.has(item.id)) seen.set(item.id, item)
  }
  return Array.from(seen.values())
}
