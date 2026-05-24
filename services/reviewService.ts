import { apolloClient } from '@/lib/apollo'
import { gql } from '@apollo/client'
import { tastyplatesFetch, unwrapEnvelope } from '@/lib/tastyplatesFetch'

const CREATE_REVIEW = gql`
  mutation CreateReview(
    $restaurantId: uuid!
    $userId: uuid!
    $body: String!
    $rating: numeric!
    $photoIds: [uuid!]
  ) {
    insert_reviews_one(
      object: {
        restaurant_id: $restaurantId
        user_id: $userId
        body: $body
        rating: $rating
        photo_ids: $photoIds
      }
    ) {
      id
      created_at
    }
  }
`

const DELETE_REVIEW = gql`
  mutation DeleteReview($reviewId: uuid!, $userId: uuid!) {
    delete_reviews(where: { id: { _eq: $reviewId }, user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`

export interface ReplyAuthorProfile {
  user_id: string
  username?: string | null
  palates?: unknown
  user?: {
    avatarUrl?: string | null
    displayName?: string | null
    email?: string | null
  } | null
}

export interface ReplyRow {
  id: string
  author_id: string
  content: string | null
  likes_count?: number | null
  user_liked?: boolean | null
  created_at: string
  AuthorProfile?: ReplyAuthorProfile | null
  author?: ReplyAuthorProfile | null
}

export interface GetRepliesResult {
  replies: ReplyRow[]
  meta: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface ToggleLikeResult {
  liked: boolean
  reviewId?: string
}

export interface CreateCommentInput {
  parent_review_id: string
  content: string
  restaurant_uuid: string
}

export interface CreateCommentResult {
  comment: ReplyRow
}

async function fetchCommentReplies(
  reviewId: string,
  options?: { limit?: number; offset?: number },
): Promise<GetRepliesResult> {
  const qs = new URLSearchParams({ review_id: reviewId })
  if (options?.limit != null) qs.set('limit', String(options.limit))
  if (options?.offset != null) qs.set('offset', String(options.offset))

  const envelope = await tastyplatesFetch<GetRepliesResult>(
    `restaurant-reviews/get-replies?${qs.toString()}`,
  )
  return unwrapEnvelope(envelope)
}

async function createComment(input: CreateCommentInput): Promise<CreateCommentResult> {
  const envelope = await tastyplatesFetch<CreateCommentResult>(
    'restaurant-reviews/create-comment',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      withAuth: true,
    },
  )
  return unwrapEnvelope(envelope)
}

async function toggleReviewLike(reviewId: string): Promise<ToggleLikeResult> {
  const envelope = await tastyplatesFetch<ToggleLikeResult>(
    'restaurant-reviews/toggle-like',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId }),
      withAuth: true,
    },
  )
  return unwrapEnvelope(envelope)
}

async function checkReviewLike(reviewId: string, userId: string): Promise<boolean> {
  const qs = new URLSearchParams({ review_id: reviewId, user_id: userId })
  const envelope = await tastyplatesFetch<{ liked: boolean }>(
    `restaurant-reviews/toggle-like?${qs.toString()}`,
    { withAuth: true },
  )
  if (!envelope.ok) return false
  return Boolean(envelope.data.liked)
}

export const reviewService = {
  fetchCommentReplies,
  createComment,
  toggleReviewLike,
  checkReviewLike,

  async createReview(params: {
    restaurantId: string
    userId: string
    body: string
    rating: number
    photoIds?: string[]
  }) {
    const { data, errors } = await apolloClient.mutate({
      mutation: CREATE_REVIEW,
      variables: params,
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.insert_reviews_one as { id: string; created_at: string }
  },

  async deleteReview(reviewId: string, userId: string) {
    const { data, errors } = await apolloClient.mutate({
      mutation: DELETE_REVIEW,
      variables: { reviewId, userId },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.delete_reviews?.affected_rows as number
  },
}
