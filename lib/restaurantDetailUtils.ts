import type { RestaurantDetailRow } from '@/services/restaurantDetailService'

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80'

/** Strip simple HTML tags for native Text. */
export function stripHtml(html: string | null | undefined): string {
  if (!html?.trim()) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectUploadedImageUrls(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    const out: string[] = []
    for (const item of raw) {
      if (typeof item === 'string' && item.startsWith('http')) out.push(item)
      else if (item && typeof item === 'object' && 'url' in item) {
        const u = (item as { url?: unknown }).url
        if (typeof u === 'string' && u.startsWith('http')) out.push(u)
      }
    }
    return out
  }
  return []
}

export function buildRestaurantImageGallery(r: RestaurantDetailRow): string[] {
  const featured = r.featured_image_url?.trim()
  const extras = collectUploadedImageUrls(r.uploaded_images)
  const set = new Set<string>()
  if (featured) set.add(featured)
  extras.forEach((u) => set.add(u))
  const list = Array.from(set)
  return list.length > 0 ? list : [PLACEHOLDER]
}

export function formatPriceRange(priceRangeId: number | null | undefined): string | null {
  if (priceRangeId == null || priceRangeId < 1) return null
  const n = Math.min(4, Math.max(1, Math.round(priceRangeId)))
  return '$'.repeat(n)
}

import { extractRestaurantTagNames } from '@/lib/restaurantPalates'

export function restaurantPalateAndCategoryLabels(r: RestaurantDetailRow): {
  primaryPalate: string | null
  categories: string[]
} {
  const palateNames = extractRestaurantTagNames(r.palates)
  const cuisineNames = extractRestaurantTagNames(r.cuisines)
  const primary = palateNames[0] ?? cuisineNames[0] ?? null
  const categories = extractRestaurantTagNames(r.categories)
  return { primaryPalate: primary, categories }
}

export function formatRestaurantAddress(r: RestaurantDetailRow): string | null {
  if (r.listing_street?.trim()) return r.listing_street.trim()
  const a = r.address
  if (!a || typeof a !== 'object') return null
  const street = typeof a.street_address === 'string' ? a.street_address : ''
  const city = typeof a.city === 'string' ? a.city : ''
  const cc = typeof a.country_short === 'string' ? a.country_short : ''
  const parts = [street, city, cc].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function formatOpeningHoursSummary(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  try {
    return JSON.stringify(raw)
  } catch {
    return null
  }
}
