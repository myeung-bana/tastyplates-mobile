import type { FollowingFeedReviewRow } from '@/services/followingFeedService'
import type { TrendingReviewRow } from '@/services/homeReviewsService'

export type RestaurantReviewBrief = {
  uuid: string
  title: string | null
  slug: string | null
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
