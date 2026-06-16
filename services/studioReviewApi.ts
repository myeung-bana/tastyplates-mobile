import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'
import type { ReviewImage } from '@/lib/reviewImageUtils'

export interface RestaurantReviewMine {
  id: string
  restaurant_uuid: string
  author_id?: string | null
  title: string | null
  content: string | null
  rating: number | null
  images?: unknown
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  published_at?: string | null
  likes_count?: number | null
}

interface UserReviewsEnvelope {
  reviews: RestaurantReviewMine[]
  meta: { total: number; limit: number; offset: number; hasMore: boolean }
}

export async function fetchMyReviews(
  userId: string,
  opts?: { limit?: number; offset?: number },
): Promise<UserReviewsEnvelope> {
  const limit = opts?.limit ?? 40
  const offset = opts?.offset ?? 0
  const params = new URLSearchParams({
    author_id: userId,
    limit: String(limit),
    offset: String(offset),
    summary: '1',
  })
  const q = `restaurant-reviews/get-user-reviews?${params.toString()}`

  const envelope = await tastyplatesFetch<UserReviewsEnvelope>(q, {
    method: 'GET',
    withAuth: true,
  })

  return unwrapEnvelope(envelope)
}

/** Paginates owner reviews (draft + live) until the API reports no more pages. */
export async function fetchAllMyReviews(userId: string): Promise<RestaurantReviewMine[]> {
  const pageSize = 100
  const all: RestaurantReviewMine[] = []
  let offset = 0

  for (;;) {
    const payload = await fetchMyReviews(userId, { limit: pageSize, offset })
    all.push(...payload.reviews)
    if (!payload.meta.hasMore || payload.reviews.length === 0) break
    offset += payload.reviews.length
  }

  return all
}

export interface CreateReviewPayload {
  restaurant_uuid: string
  author_id: string
  title?: string | null
  content: string
  rating: number
  status: 'approved' | 'draft'
  images?: ReviewImage[] | null
  recognitions?: string[]
}

export async function createRestaurantReview(payload: CreateReviewPayload): Promise<RestaurantReviewMine> {
  const envelope = await tastyplatesFetch<{ review: RestaurantReviewMine }>(
    'restaurant-reviews/create-review',
    {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(payload),
    },
  )
  const data = unwrapEnvelope(envelope)
  return data.review
}

export interface UpdateReviewPayload {
  id: string
  title?: string | null
  content?: string
  rating?: number | null
  status?: 'approved' | 'draft' | 'pending' | null
  images?: ReviewImage[] | null
}

export async function updateRestaurantReview(payload: UpdateReviewPayload): Promise<RestaurantReviewMine> {
  const envelope = await tastyplatesFetch<{ review: RestaurantReviewMine }>(
    'restaurant-reviews/update-review',
    {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(payload),
    },
  )
  const data = unwrapEnvelope(envelope)
  return data.review
}

export async function fetchReviewById(id: string): Promise<RestaurantReviewMine> {
  const q = `restaurant-reviews/get-review-by-id?id=${encodeURIComponent(id)}`

  const envelope = await tastyplatesFetch<{ review: RestaurantReviewMine }>(q, {
    method: 'GET',
    withAuth: true,
  })

  const data = unwrapEnvelope(envelope)
  return data.review
}

export async function deleteRestaurantReview(id: string): Promise<void> {
  const q = `restaurant-reviews/delete-review?id=${encodeURIComponent(id)}`
  unwrapEnvelope(await tastyplatesFetch<{ deleted: boolean; id: string }>(q, { method: 'DELETE', withAuth: true }))
}
