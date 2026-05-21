import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

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
  const q = `restaurant-reviews/get-user-reviews?author_id=${encodeURIComponent(userId)}&limit=${limit}&offset=${offset}`

  const envelope = await tastyplatesFetch<UserReviewsEnvelope>(q, {
    method: 'GET',
    withAuth: true,
  })

  return unwrapEnvelope(envelope)
}

export interface CreateReviewPayload {
  restaurant_uuid: string
  title?: string | null
  content: string
  rating: number
  status: 'approved' | 'draft'
  images?: string[] | null
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
  images?: string[] | null
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
