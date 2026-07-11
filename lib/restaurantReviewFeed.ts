import type { FollowingFeedReviewRow } from '@/services/followingFeedService'
import type { TrendingReviewRow } from '@/services/homeReviewsService'
import type { RestaurantReviewPreview } from '@/services/restaurantDetailService'

export type RestaurantReviewBrief = {
  uuid: string
  title: string | null
  slug: string | null
}

/** Maps restaurant detail preview rows to {@link HomeReviewCard} shape. */
export function restaurantPreviewToTrendingRow(
  preview: RestaurantReviewPreview,
  restaurantUuid: string,
): TrendingReviewRow {
  const author = preview.AuthorProfile
  return {
    id: preview.id,
    author_id: author?.user_id ?? '',
    content: preview.content,
    created_at: '',
    images: preview.images,
    rating: preview.rating,
    title: preview.title,
    restaurant_uuid: restaurantUuid,
    likes_count: preview.likes_count,
    AuthorProfile: author
      ? {
          user_id: author.user_id,
          username: author.username,
          palates: author.palates,
          user: author.user
            ? {
                avatarUrl: author.user.avatarUrl,
                email: author.user.email,
                displayName: author.user.displayName ?? null,
              }
            : null,
        }
      : null,
  }
}

/** Shape rows for {@link FollowingFeedReviewCard} on restaurant review lists. */
export function toRestaurantFeedReviewRow(
  review: TrendingReviewRow,
  restaurant: RestaurantReviewBrief,
): FollowingFeedReviewRow {
  return {
    ...review,
    restaurant,
  }
}
