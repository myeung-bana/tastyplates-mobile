import { useState, useCallback } from 'react'
import { useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { useAuth } from './useAuth'

const LIKE_REVIEW = gql`
  mutation LikeReview($reviewId: uuid!, $userId: uuid!) {
    insert_review_likes_one(object: { review_id: $reviewId, user_id: $userId }) {
      id
    }
  }
`

const UNLIKE_REVIEW = gql`
  mutation UnlikeReview($reviewId: uuid!, $userId: uuid!) {
    delete_review_likes(
      where: { review_id: { _eq: $reviewId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`

export interface UseReviewLikeOptions {
  reviewId: string
  initialLiked: boolean
  initialCount: number
}

export interface UseReviewLikeResult {
  liked: boolean
  likeCount: number
  toggle: () => void
  loading: boolean
}

/**
 * Optimistic like toggle for a review.
 *
 * Flips the local state immediately, then fires the mutation.
 * On error, reverts the optimistic update.
 */
export function useReviewLike({
  reviewId,
  initialLiked,
  initialCount,
}: UseReviewLikeOptions): UseReviewLikeResult {
  const { user } = useAuth()
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialCount)

  const [likeReview, { loading: liking }] = useMutation(LIKE_REVIEW)
  const [unlikeReview, { loading: unliking }] = useMutation(UNLIKE_REVIEW)

  const toggle = useCallback(() => {
    if (!user) return

    const wasLiked = liked
    const prevCount = likeCount

    setLiked(!wasLiked)
    setLikeCount(wasLiked ? prevCount - 1 : prevCount + 1)

    const mutation = wasLiked ? unlikeReview : likeReview

    mutation({ variables: { reviewId, userId: user.id } }).catch(() => {
      setLiked(wasLiked)
      setLikeCount(prevCount)
    })
  }, [liked, likeCount, user, reviewId, likeReview, unlikeReview])

  return {
    liked,
    likeCount,
    toggle,
    loading: liking || unliking,
  }
}
