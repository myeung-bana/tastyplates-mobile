import { RESTAURANT_PARENT_CATEGORIES } from '@/constants/restaurantCategories'
import { QUICK_FINDS } from '@/constants/quickFinds'
import type {
  RestaurantListCategory,
  RestaurantListCuisine,
} from '@/services/restaurantsV2Service'

/** Google types too generic to show as cuisine or category labels. */
const SKIP_TYPES = new Set([
  'establishment',
  'point_of_interest',
  'food',
  'restaurant',
  'store',
  'meal_delivery',
  'meal_takeaway',
  'political',
  'locality',
  'sublocality',
  'neighborhood',
  'premise',
  'street_address',
  'route',
  'plus_code',
])

/** Cuisine-specific Google place types → display label (orange image pill). */
const GOOGLE_CUISINE_TYPE_LABELS: Record<string, string> = {
  african_restaurant: 'African',
  american_restaurant: 'American',
  asian_restaurant: 'Asian',
  barbecue_restaurant: 'Barbecue',
  brazilian_restaurant: 'Brazilian',
  chinese_restaurant: 'Chinese',
  french_restaurant: 'French',
  greek_restaurant: 'Greek',
  hamburger_restaurant: 'American',
  indian_restaurant: 'Indian',
  indonesian_restaurant: 'Indonesian',
  italian_restaurant: 'Italian',
  japanese_restaurant: 'Japanese',
  korean_restaurant: 'Korean',
  lebanese_restaurant: 'Lebanese',
  mediterranean_restaurant: 'Mediterranean',
  mexican_restaurant: 'Mexican',
  middle_eastern_restaurant: 'Middle Eastern',
  pizza_restaurant: 'Italian',
  ramen_restaurant: 'Japanese',
  seafood_restaurant: 'Seafood',
  spanish_restaurant: 'Spanish',
  steak_house: 'Steakhouse',
  sushi_restaurant: 'Japanese',
  thai_restaurant: 'Thai',
  turkish_restaurant: 'Turkish',
  vegan_restaurant: 'Vegetarian/Vegan',
  vegetarian_restaurant: 'Vegetarian/Vegan',
  vietnamese_restaurant: 'Vietnamese',
}

/** Establishment Google types → TastyPlates parent category label (below title). */
const GOOGLE_CATEGORY_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar',
  cafe: 'Cafe',
  bakery: 'Bakery',
  night_club: 'Bar',
  pub: 'Pub',
  food_court: 'Food Court',
  buffet: 'Buffet',
  meal_takeaway: 'Fast Casual',
  meal_delivery: 'Fast Casual',
  fast_food_restaurant: 'Fast Food',
  fine_dining_restaurant: 'Fine Dining',
  brunch_restaurant: 'Brunch Spot',
  dessert_shop: 'Dessert Shop',
  ice_cream_shop: 'Dessert Shop',
  wine_bar: 'Bar',
  brewpub: 'Pub',
}

export type GooglePlaceTagFallback = {
  slug: string
  label: string
}

export type AdaptGooglePlaceTypesOptions = {
  /** Active cuisine browse filter — used when Google types are vague. */
  cuisineFallback?: GooglePlaceTagFallback | null
  /** Active category browse filter — used when no establishment type is found. */
  categoryFallback?: GooglePlaceTagFallback | null
}

function normalizeTypes(types: string[] | null | undefined): string[] {
  return (types ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function labelFromCuisineType(type: string): string | null {
  const mapped = GOOGLE_CUISINE_TYPE_LABELS[type]
  if (mapped) return mapped

  if (!type.endsWith('_restaurant')) return null
  const stem = type.replace(/_restaurant$/, '').replace(/_/g, ' ')
  if (!stem || SKIP_TYPES.has(stem)) return null
  return titleCaseWords(stem)
}

function labelFromCategoryType(type: string): string | null {
  return GOOGLE_CATEGORY_TYPE_LABELS[type] ?? null
}

function slugFromLabel(label: string): string {
  return label.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function makeCuisine(label: string, slug?: string): RestaurantListCuisine {
  const s = slug?.trim() || slugFromLabel(label)
  return { id: 0, name: label, slug: s }
}

function makeCategory(label: string, slug?: string): RestaurantListCategory {
  const s = slug?.trim() || slugFromLabel(label)
  const parent = RESTAURANT_PARENT_CATEGORIES.find(
    (c) => c.slug === s || c.label.toLowerCase() === label.toLowerCase(),
  )
  return {
    id: 0,
    name: parent?.label ?? label,
    slug: parent?.slug ?? s,
    parent_id: null,
  }
}

function pickCuisineLabel(types: string[]): string | null {
  for (const type of types) {
    if (SKIP_TYPES.has(type)) continue
    const label = labelFromCuisineType(type)
    if (label) return label
  }
  return null
}

function pickCategoryLabel(types: string[]): string | null {
  for (const type of types) {
    if (SKIP_TYPES.has(type)) continue
    const label = labelFromCategoryType(type)
    if (label) return label
  }
  return null
}

/**
 * Map Google Places `types` to TP-shaped cuisine pills + parent category labels
 * for {@link RestaurantBrowseCard} parity on gap-fill rows.
 */
export function adaptGooglePlaceTypes(
  types: string[] | null | undefined,
  options: AdaptGooglePlaceTypesOptions = {},
): { cuisines: RestaurantListCuisine[]; categories: RestaurantListCategory[] } {
  const normalized = normalizeTypes(types)

  let cuisineLabel = pickCuisineLabel(normalized)
  if (!cuisineLabel && options.cuisineFallback?.label) {
    cuisineLabel = options.cuisineFallback.label
  }

  let categoryLabel = pickCategoryLabel(normalized)
  if (!categoryLabel && options.categoryFallback?.label) {
    categoryLabel = options.categoryFallback.label
  }

  const cuisines: RestaurantListCuisine[] = []
  const categories: RestaurantListCategory[] = []

  if (cuisineLabel) {
    const cuisineSlug =
      options.cuisineFallback?.label === cuisineLabel
        ? options.cuisineFallback.slug
        : undefined
    cuisines.push(makeCuisine(cuisineLabel, cuisineSlug))
  }

  if (categoryLabel) {
    const categorySlug =
      options.categoryFallback?.label === categoryLabel
        ? options.categoryFallback.slug
        : undefined
    categories.push(makeCategory(categoryLabel, categorySlug))
  }

  return { cuisines, categories }
}

/** Resolve browse-filter label from an active cuisine route param. */
export function cuisineFallbackFromSlug(
  slug: string | null | undefined,
): GooglePlaceTagFallback | null {
  const trimmed = slug?.trim()
  if (!trimmed) return null

  const quick = QUICK_FINDS.find((item) => item.slug === trimmed)
  if (quick) return { slug: quick.slug, label: quick.label }

  return { slug: trimmed, label: titleCaseWords(trimmed.replace(/-/g, ' ')) }
}

/** Resolve browse-filter label from an active category route param. */
export function categoryFallbackFromSlug(
  slug: string | null | undefined,
): GooglePlaceTagFallback | null {
  const trimmed = slug?.trim().toLowerCase()
  if (!trimmed) return null

  const entry = RESTAURANT_PARENT_CATEGORIES.find((item) => item.slug === trimmed)
  if (entry) return { slug: entry.slug, label: entry.label }

  return { slug: trimmed, label: titleCaseWords(trimmed.replace(/-/g, ' ')) }
}

export function googleTagFallbacksFromBrowseFilters(
  cuisineSlug: string | null | undefined,
  categorySlug: string | null | undefined,
): Pick<AdaptGooglePlaceTypesOptions, 'cuisineFallback' | 'categoryFallback'> {
  const cuisineFallback = cuisineFallbackFromSlug(cuisineSlug)
  const categoryFallback = categoryFallbackFromSlug(categorySlug)
  return {
    cuisineFallback: cuisineFallback ?? undefined,
    categoryFallback: categoryFallback ?? undefined,
  }
}
