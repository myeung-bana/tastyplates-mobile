import { apolloClient } from '@/lib/apollo'
import { gql } from '@apollo/client'

const TOGGLE_LIKE = gql`
  mutation ToggleReviewLike($reviewId: uuid!, $userId: uuid!, $liked: Boolean!) {
    result: toggle_review_like(args: { review_id: $reviewId, user_id: $userId, liked: $liked }) {
      liked
      like_count
    }
  }
`

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

export const reviewService = {
  async toggleLike(reviewId: string, userId: string, liked: boolean) {
    const { data, errors } = await apolloClient.mutate({
      mutation: TOGGLE_LIKE,
      variables: { reviewId, userId, liked },
    })
    if (errors?.length) throw new Error(errors[0].message)
    return data?.result as { liked: boolean; like_count: number }
  },

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
