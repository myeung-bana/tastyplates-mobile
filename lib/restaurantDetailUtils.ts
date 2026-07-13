import { extractRestaurantTagNames } from '@/lib/restaurantPalates'
import { resolveEffectiveFeaturedImageUrl } from '@/lib/featuredImageUtils'
import { DEFAULT_RESTAURANT_IMAGE } from '@/constants/images'
import type { RestaurantDetailRow } from '@/services/restaurantDetailService'

const PLACEHOLDER = DEFAULT_RESTAURANT_IMAGE

export interface OpeningHours {
  [day: string]: string
}

export interface FormattedDay {
  day: string
  hours: string
  isToday: boolean
  isClosed: boolean
}

export interface GroupedHours {
  days: string[]
  hours: string
  isToday: boolean
  isClosed: boolean
}

export interface CategoryNode {
  name: string
  slug: string
}

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
  const featured = resolveEffectiveFeaturedImageUrl(r.featured_image_url)
  const extras = collectUploadedImageUrls(r.uploaded_images)
    .map((u) => resolveEffectiveFeaturedImageUrl(u))
    .filter((u): u is string => u != null)
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

/** Category nodes with slug for navigable pills. */
export function extractCategoryNodes(field: unknown): CategoryNode[] {
  if (!Array.isArray(field)) return []
  const out: CategoryNode[] = []
  const seen = new Set<string>()
  for (const el of field) {
    if (!el || typeof el !== 'object' || !('name' in el)) continue
    const name =
      typeof (el as { name?: unknown }).name === 'string'
        ? (el as { name: string }).name.trim()
        : ''
    const slugRaw = (el as { slug?: unknown }).slug
    const slug =
      typeof slugRaw === 'string' && slugRaw.trim()
        ? slugRaw.trim()
        : name.toLowerCase().replace(/\s+/g, '-')
    if (name && slug && !seen.has(slug)) {
      seen.add(slug)
      out.push({ name, slug })
    }
  }
  return out
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

/** Header location line — listing street, else city/state, else fallback. */
export function resolveRestaurantHeaderLocation(r: RestaurantDetailRow): string {
  if (r.listing_street?.trim()) return r.listing_street.trim()
  const a = r.address
  if (a && typeof a === 'object') {
    const city = typeof a.city === 'string' ? a.city : ''
    const state =
      typeof a.state_short === 'string'
        ? a.state_short
        : typeof a.stateShort === 'string'
          ? a.stateShort
          : typeof a.state === 'string'
            ? a.state
            : ''
    if (city && state) return `${city}, ${state}`
    if (city) return city
  }
  return 'Address not available'
}

function readPlaceId(r: RestaurantDetailRow): string | null {
  const a = r.address
  if (!a || typeof a !== 'object') return null
  if (typeof a.place_id === 'string' && a.place_id.trim()) return a.place_id.trim()
  if (typeof a.placeId === 'string' && a.placeId.trim()) return a.placeId.trim()
  return null
}

export function buildGoogleMapsPlaceUrl(r: RestaurantDetailRow): string | null {
  const placeId = readPlaceId(r)
  if (placeId) return `https://www.google.com/maps/place/?q=place_id:${placeId}`
  const lat = r.latitude
  const lng = r.longitude
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  const addr = formatRestaurantAddress(r) ?? resolveRestaurantHeaderLocation(r)
  if (addr && addr !== 'Address not available') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
  }
  return null
}

export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function buildDirectionsUrl(r: RestaurantDetailRow): string {
  const lat = r.latitude
  const lng = r.longitude
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return mapsDirectionsUrl(lat, lng)
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.title} ${resolveRestaurantHeaderLocation(r)}`)}`
}

export function hasValidCoordinates(r: RestaurantDetailRow): boolean {
  const lat = r.latitude
  const lng = r.longitude
  return lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
}

export function parseOpeningHours(
  openingHours: string | object | null | undefined,
): OpeningHours | null {
  if (!openingHours) return null

  if (typeof openingHours === 'string') {
    try {
      return JSON.parse(openingHours) as OpeningHours
    } catch {
      return null
    }
  }

  if (typeof openingHours === 'object') {
    return openingHours as OpeningHours
  }

  return null
}

export function getCurrentDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

const getDayOrder = (day: string): number => {
  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  }
  return dayMap[day] ?? -1
}

export function formatOpeningHours(
  openingHours: string | object | null | undefined,
): FormattedDay[] {
  const parsed = parseOpeningHours(openingHours)
  if (!parsed) return []

  const currentDay = getCurrentDay()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return days
    .map((day) => ({
      day,
      hours: parsed[day] || 'Not available',
      isToday: day === currentDay,
      isClosed: parsed[day]?.toLowerCase() === 'closed' || !parsed[day],
    }))
    .sort((a, b) => getDayOrder(a.day) - getDayOrder(b.day))
}

const areConsecutiveDays = (day1: string, day2: string): boolean => {
  const order1 = getDayOrder(day1)
  const order2 = getDayOrder(day2)
  if (order2 === order1 + 1) return true
  if (order1 === 6 && order2 === 0) return true
  return false
}

export function groupOpeningHours(
  openingHours: string | object | null | undefined,
): GroupedHours[] {
  const formatted = formatOpeningHours(openingHours)
  if (formatted.length === 0) return []

  const grouped: GroupedHours[] = []
  let currentGroup: GroupedHours | null = null

  formatted.forEach((item, index) => {
    const previousItem = index > 0 ? formatted[index - 1] : null

    const isSameHours =
      currentGroup &&
      currentGroup.hours === item.hours &&
      currentGroup.isClosed === item.isClosed

    const isConsecutive = previousItem ? areConsecutiveDays(previousItem.day, item.day) : false

    if (isSameHours && isConsecutive && currentGroup) {
      currentGroup.days.push(item.day)
      if (item.isToday) currentGroup.isToday = true
    } else {
      if (currentGroup) grouped.push(currentGroup)
      currentGroup = {
        days: [item.day],
        hours: item.hours,
        isToday: item.isToday,
        isClosed: item.isClosed,
      }
    }

    if (index === formatted.length - 1 && currentGroup) {
      grouped.push(currentGroup)
    }
  })

  return grouped
}

export function formatDayRange(days: string[]): string {
  if (days.length === 1) return days[0].substring(0, 3)

  if (days.length === 2) {
    return `${days[0].substring(0, 3)}, ${days[1].substring(0, 3)}`
  }

  const sortedDays = [...days].sort((a, b) => getDayOrder(a) - getDayOrder(b))
  const isConsecutive = sortedDays.every((day, index) => {
    if (index === 0) return true
    const prevDay = sortedDays[index - 1]
    return (
      getDayOrder(day) === getDayOrder(prevDay) + 1 ||
      (getDayOrder(prevDay) === 6 && getDayOrder(day) === 0)
    )
  })

  if (isConsecutive) {
    return `${sortedDays[0].substring(0, 3)} - ${sortedDays[sortedDays.length - 1].substring(0, 3)}`
  }

  return days.map((d) => d.substring(0, 3)).join(', ')
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

export function isRestaurantOpenToday(openingHours: string | object | null | undefined): boolean | null {
  const parsed = parseOpeningHours(openingHours)
  if (!parsed) return null
  const todayHours = parsed[getCurrentDay()]
  if (!todayHours || todayHours.toLowerCase() === 'closed') return false
  return true
}

export function todayOpeningHoursSummary(openingHours: string | object | null | undefined): string {
  const grouped = groupOpeningHours(openingHours)
  const todayGroup = grouped.find((g) => g.isToday)
  if (!todayGroup) return 'Not available'
  if (todayGroup.isClosed) return 'Closed'
  return `Open · ${todayGroup.hours}`
}
