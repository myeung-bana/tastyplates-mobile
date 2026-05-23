import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import { normalizeRestaurantAddressJson, type FeaturedRestaurantApi } from '@/lib/homeContentApi'
import { stripHtml } from '@/lib/restaurantDetailUtils'
import { formatRestaurantCardAddress } from '@/services/restaurantsV2Service'

export interface ArticleAuthorProfile {
  displayName?: string | null
  avatarUrl?: string | null
}

/** `article_restaurant_associations` + nested `restaurant` from Nhost `get-article-by-*` (batch-enriched). */
export interface ArticleLinkedRestaurant {
  id: number
  slug: string
  title: string
  featured_image_url: string | null
  listing_street: string | null
  address: unknown
  average_rating: number | null
  ratings_count: number | null
  /** Long HTML description from Hasura — strip/truncate for card body. */
  content?: string | null
}

export interface ArticleRestaurantAssociation {
  id: number
  article_id?: number | null
  restaurant_id: number
  display_order?: number | null
  created_at?: string | null
  restaurant?: ArticleLinkedRestaurant | null
}

/** Row from `articles/get-article-by-slug` / `articles/get-article-by-id`. */
export interface ArticleDetail {
  id: number
  uuid?: string | null
  slug?: string | null
  title: string
  excerpt?: string | null
  content?: string | null
  category?: string | null
  featured_image_url?: string | null
  featured_image_alt?: string | null
  reading_time_minutes?: number | null
  published_at?: string | null
  updated_at?: string | null
  author_profile?: ArticleAuthorProfile | null
  article_restaurant_associations?: ArticleRestaurantAssociation[] | null
}

/** Single-column restaurant cards below article HTML (`articlev2.md` §6, `design_system.md` §5.3 Card). */
export interface ArticleRestaurantSectionItem {
  associationId: number
  title: string
  slug: string
  imageUrl: string | null
  description: string | null
  addressLine: string | null
}

const DESCRIPTION_PLAIN_MAX = 220

function truncateArticlePlain(text: string, maxLen: number): string {
  const t = text.trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen).trimEnd()}…`
}

function restaurantDescriptionPlain(content: string | null | undefined): string | null {
  const plain = stripHtml(content ?? '').trim()
  if (!plain) return null
  return truncateArticlePlain(plain, DESCRIPTION_PLAIN_MAX)
}

/** Maps associations to §6 restaurant cards — preserves `display_order` from API. */
export function mapArticleAssociationsToSectionItems(
  assocs: ArticleRestaurantAssociation[] | null | undefined,
): ArticleRestaurantSectionItem[] {
  if (!assocs?.length) return []
  const out: ArticleRestaurantSectionItem[] = []
  for (const a of assocs) {
    const r = a.restaurant
    if (!r?.slug) continue
    out.push({
      associationId: a.id,
      title: r.title,
      slug: r.slug,
      imageUrl: r.featured_image_url ?? null,
      description: restaurantDescriptionPlain(r.content),
      addressLine: formatRestaurantCardAddress(
        r.listing_street,
        normalizeRestaurantAddressJson(r.address) as Parameters<
          typeof formatRestaurantCardAddress
        >[1],
      ),
    })
  }
  return out
}

export function mapArticleAssociationsToFeatured(
  assocs: ArticleRestaurantAssociation[] | null | undefined,
): FeaturedRestaurantApi[] {
  if (!assocs?.length) return []
  const out: FeaturedRestaurantApi[] = []
  for (const a of assocs) {
    const r = a.restaurant
    if (!r?.slug) continue
    out.push({
      id: a.id,
      restaurant: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        featured_image_url: r.featured_image_url ?? null,
        listing_street: r.listing_street ?? null,
        address: normalizeRestaurantAddressJson(r.address),
        average_rating: r.average_rating ?? null,
        ratings_count: r.ratings_count ?? null,
      },
    })
  }
  return out
}

export interface ArticleDetailPayload {
  article: ArticleDetail
  /** Present from `articles/get-article-by-*` — linked-restaurant batch merge status (`articlev2.md`). */
  articleMeta?: {
    restaurantEnrichment: 'skipped' | 'ok' | 'partial' | 'failed'
  }
}

export async function fetchArticleBySlug(slug: string): Promise<ArticleDetail> {
  const q = new URLSearchParams({ slug: slug.trim() })
  const envelope = await tastyplatesFetch<ArticleDetailPayload>(
    `articles/get-article-by-slug?${q.toString()}`,
  )
  return unwrapEnvelope(envelope).article
}

export async function fetchArticleByPkId(id: number): Promise<ArticleDetail> {
  const envelope = await tastyplatesFetch<ArticleDetailPayload>(
    `articles/get-article-by-id?id=${encodeURIComponent(String(id))}`,
  )
  return unwrapEnvelope(envelope).article
}

/** Same as `fetchArticleBySlug` but exposes `articleMeta.restaurantEnrichment` for UI telemetry. */
export async function fetchArticleBySlugWithMeta(slug: string): Promise<ArticleDetailPayload> {
  const q = new URLSearchParams({ slug: slug.trim() })
  const envelope = await tastyplatesFetch<ArticleDetailPayload>(
    `articles/get-article-by-slug?${q.toString()}`,
  )
  return unwrapEnvelope(envelope)
}

export async function fetchArticleByPkIdWithMeta(id: number): Promise<ArticleDetailPayload> {
  const envelope = await tastyplatesFetch<ArticleDetailPayload>(
    `articles/get-article-by-id?id=${encodeURIComponent(String(id))}`,
  )
  return unwrapEnvelope(envelope)
}
