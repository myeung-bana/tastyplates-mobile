/**
 * All screen route constants.
 *
 * Files can live under `app/(tabs)/…` so the bottom tab navigator stays mounted, but **`Href`s
 * typically omit `(tabs)`** — use `/studio/...`, `/restaurants/...`, etc. Expo resolves them to tabbed routes.
 *
 * Visible tab targets (`/(tabs)`, `/(tabs)/restaurants`) keep the `(tabs)` prefix where the typed router expects it.
 */

// ─── Tabs (bottom navigator) ──────────────────────────────────────────────────

export const SCREEN_HOME = '/(tabs)' as const
export const SCREEN_RESTAURANTS = '/(tabs)/restaurants' as const
export const SCREEN_FOLLOWING = '/(tabs)/following' as const
/** `/studio` index redirects to {@link SCREEN_STUDIO_ADD_REVIEW}; tab shortcuts use modal quick actions (+). */
export const SCREEN_STUDIO_ENTRY = '/studio' as const
export const SCREEN_PROFILE = '/(tabs)/profile' as const

// ─── Authentication ───────────────────────────────────────────────────────────

export const SCREEN_LOGIN = '/login' as const
/** First-launch marketing carousel before login (skipped when `resume` is set on the tab gate). */
export const SCREEN_GET_STARTED = '/get-started' as const
export const SCREEN_REGISTER = '/register' as const
export const SCREEN_USER_VERIFICATION = '/user-verification' as const
export const SCREEN_ONBOARDING = '/onboarding/step1' as const
export const SCREEN_FORGOT_PASSWORD = '/forgot-password' as const
export const SCREEN_RESET_PASSWORD = '/reset-password' as const

// ─── Restaurant screens ───────────────────────────────────────────────────────

export const SCREEN_RESTAURANT_DETAIL = '/restaurants/[slug]' as const
export const SCREEN_RESTAURANT_CUISINE = '/restaurants/cuisines/[slug]' as const

/** Build the restaurant detail path for a given slug. */
export function restaurantDetailPath(slug: string): string {
  return `/restaurants/${encodeURIComponent(slug)}`
}

/** Build the cuisine browse path for a given cuisine slug. */
export function cuisineBrowsePath(slug: string): string {
  return `/restaurants/cuisines/${encodeURIComponent(slug)}`
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const SCREEN_REVIEW_VIEWER = '/reviews/viewer' as const
export const SCREEN_REVIEW_COMMENTS = '/(tabs)/reviews/[reviewId]/comments' as const

/** Full comments thread for a review UUID. */
export function reviewCommentsPath(reviewId: string): string {
  return `/(tabs)/reviews/${encodeURIComponent(reviewId)}/comments`
}

// ─── Articles (editorial) ────────────────────────────────────────────────────

export const SCREEN_ARTICLES_LIST = '/articles' as const
export const SCREEN_ARTICLE_DETAIL = '/articles/[slug]' as const

/** In-app article detail; `segment` is slug **or** numeric id string. */
export function articleDetailPath(segment: string): string {
  return `/articles/${encodeURIComponent(segment.replace(/^\/+/, ''))}`
}

// ─── TastyStudio ─────────────────────────────────────────────────────────────

export const SCREEN_STUDIO_ADD_REVIEW = '/studio/add-review' as const
export const SCREEN_STUDIO_ADD_REVIEW_WRITE = '/studio/add-review/[slug]' as const
export const SCREEN_STUDIO_ADD_REVIEW_CREATE = '/studio/add-review/create' as const
export const SCREEN_STUDIO_ADD_REVIEW_SUCCESS = '/studio/add-review/success' as const
export const SCREEN_STUDIO_REVIEW_LISTING = '/studio/review-listing' as const
export const SCREEN_STUDIO_MY_LISTS = '/studio/my-lists' as const
export const SCREEN_STUDIO_EDIT_REVIEW = '/studio/edit-review/[id]' as const

// ─── Manage Lists (user-curated playlists) ────────────────────────────────────

export const SCREEN_STUDIO_MANAGE_LISTS = '/studio/manage-lists' as const
export const SCREEN_STUDIO_MANAGE_LISTS_CREATE = '/studio/manage-lists/create' as const
export const SCREEN_STUDIO_MANAGE_LIST_DETAIL = '/studio/manage-lists/[uuid]' as const
export const SCREEN_STUDIO_MANAGE_LIST_EDIT = '/studio/manage-lists/[uuid]/edit' as const
export const SCREEN_STUDIO_MANAGE_LIST_ADD = '/studio/manage-lists/[uuid]/add' as const

/** Build the manage-list detail path for a given list UUID. */
export function studioManageListDetailPath(uuid: string): string {
  return `/studio/manage-lists/${encodeURIComponent(uuid)}`
}

/** Build the add-restaurant path for a given list UUID. */
export function studioManageListAddPath(uuid: string): string {
  return `/studio/manage-lists/${encodeURIComponent(uuid)}/add`
}

/** Build the edit path for a given list UUID. */
export function studioManageListEditPath(uuid: string): string {
  return `/studio/manage-lists/${encodeURIComponent(uuid)}/edit`
}

/** Build the write-review path for a given restaurant slug. */
export function studioAddReviewWritePath(slug: string): string {
  return `/studio/add-review/${encodeURIComponent(slug)}`
}

/** Build the edit-review path for a given review ID. */
export function studioEditReviewPath(id: string): string {
  return `/studio/edit-review/${encodeURIComponent(id)}`
}

// ─── Restaurant listing (create a restaurant) ─────────────────────────────────

export const SCREEN_LISTING_EXPLANATION = '/listing/explanation' as const
export const SCREEN_LISTING_STEP_1 = '/listing/step-1' as const
export const SCREEN_LISTING_STEP_2 = '/listing/step-2' as const
export const SCREEN_LISTING_DRAFT = '/listing/draft' as const

// ─── User profile ─────────────────────────────────────────────────────────────

export const SCREEN_OWN_PROFILE = '/(tabs)/profile' as const
export const SCREEN_EDIT_PROFILE = '/(tabs)/profile/edit' as const
export const SCREEN_PUBLIC_PROFILE = '/(tabs)/profile/[userId]' as const
export const SCREEN_PUBLIC_PROFILE_FOLLOWERS =
  '/(tabs)/profile/[userId]/followers' as const
export const SCREEN_PUBLIC_PROFILE_FOLLOWING =
  '/(tabs)/profile/[userId]/following' as const
export const SCREEN_PUBLIC_PROFILE_REVIEWS =
  '/(tabs)/profile/[userId]/reviews' as const

/** Build public profile path (UUID **or** username slug — see `RestaurantUserRow` + Nhost handlers). */
export function publicProfilePath(userIdOrUsername: string): string {
  return `/(tabs)/profile/${encodeURIComponent(userIdOrUsername.replace(/^@/, ''))}`
}

// ─── Hashtag feed ─────────────────────────────────────────────────────────────

export const SCREEN_HASHTAG_FEED = '/hashtag/[hashtag]' as const

/** Build the hashtag feed path for a given hashtag (without #). */
export function hashtagFeedPath(hashtag: string): string {
  return `/hashtag/${encodeURIComponent(hashtag)}`
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const SCREEN_SETTINGS = '/settings' as const
export const SCREEN_SETTINGS_PROFILE = '/settings/account-security/profile' as const
export const SCREEN_SETTINGS_PASSWORD = '/settings/account-security/password' as const
export const SCREEN_SETTINGS_LANGUAGE = '/settings/general/language' as const
export const SCREEN_SETTINGS_ABOUT = '/settings/support/about' as const

// ─── Legal ────────────────────────────────────────────────────────────────────

export const SCREEN_PRIVACY_POLICY = '/privacy-policy' as const
export const SCREEN_COOKIE_POLICY = '/cookie-policy' as const
export const SCREEN_TERMS_OF_SERVICE = '/terms-of-service' as const
export const SCREEN_CONTENT_GUIDELINES = '/content-guidelines' as const

// ─── Google Place (defer full in-app viewer — see tasty-studio-maps-v1.1.md) ─

export const SCREEN_PLACES_GOOGLE_DETAIL = '/places/google/[place_id]' as const

export function googlePlaceDetailPath(placeId: string): string {
  return `/places/google/${encodeURIComponent(placeId)}`
}
