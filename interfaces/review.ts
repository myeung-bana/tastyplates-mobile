import type { UserSummary } from './user'
import type { RestaurantSummary } from './restaurant'

export interface Review {
  id: string
  body: string
  rating: number
  photoIds: string[]
  likeCount: number
  commentCount: number
  isLikedByMe: boolean
  hashtags: string[]
  isDraft: boolean
  createdAt: string
  updatedAt: string
  author: UserSummary
  restaurant: RestaurantSummary
}

export interface ReviewSummary {
  id: string
  body: string
  rating: number
  coverPhotoId: string | null
  likeCount: number
  commentCount: number
  isLikedByMe: boolean
  createdAt: string
  author: Pick<UserSummary, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  restaurant: Pick<RestaurantSummary, 'id' | 'slug' | 'name' | 'cuisineType'>
}

export interface ReviewComment {
  id: string
  body: string
  createdAt: string
  author: Pick<UserSummary, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  parentId: string | null
  replies: ReviewComment[]
}

export type ReviewDraft = Omit<Review, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}
