import type { GooglePlaceReview } from '@/lib/googlePlaces'
import type { RestaurantReviewPreview } from '@/services/restaurantDetailService'

const GOOGLE_REVIEW_MAX = 5

/** Maps Google Place Details review snippets into read-only restaurant detail previews. */
export function adaptGoogleReviewsToPreviews(
  reviews: GooglePlaceReview[] | undefined,
  placeId: string,
): RestaurantReviewPreview[] {
  return (reviews ?? [])
    .filter((review) => {
      const text = review.text?.trim() ?? ''
      return text.length > 0 || (review.rating != null && review.rating > 0)
    })
    .slice(0, GOOGLE_REVIEW_MAX)
    .map((review, index) => {
      const authorName = review.author_name?.trim() || 'Google user'
      return {
        id: `google-${placeId}-${index}`,
        title: null,
        content: review.text?.trim() || null,
        rating: review.rating ?? null,
        images: null,
        status: 'approved',
        relativeTimeLabel: review.relative_time_description?.trim() || null,
        googleAuthorUrl: review.author_url?.trim() || null,
        AuthorProfile: {
          user_id: `google-${placeId}-${index}`,
          username: null,
          palates: null,
          user: {
            avatarUrl: review.profile_photo_url?.trim() || null,
            email: null,
            displayName: authorName,
          },
        },
      }
    })
}
