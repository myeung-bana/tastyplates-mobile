/**
 * All screen route path constants.
 *
 * Every router.push() / router.replace() call in the app must import from here.
 * Never hardcode path strings inline in components.
 */

// ─── Tabs (bottom navigator) ──────────────────────────────────────────────────

export const SCREEN_HOME = '/(tabs)' as const
export const SCREEN_RESTAURANTS = '/(tabs)/restaurants' as const
export const SCREEN_FOLLOWING = '/(tabs)/following' as const
export const SCREEN_STUDIO = '/(tabs)/studio' as const
export const SCREEN_PROFILE = '/(tabs)/profile' as const

// ─── Authentication ───────────────────────────────────────────────────────────

export const SCREEN_LOGIN = '/login' as const
export const SCREEN_REGISTER = '/register' as const
export const SCREEN_USER_VERIFICATION = '/user-verification' as const
export const SCREEN_ONBOARDING = '/onboarding' as const
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

// ─── TastyStudio ─────────────────────────────────────────────────────────────

export const SCREEN_STUDIO_ADD_REVIEW = '/studio/add-review' as const
export const SCREEN_STUDIO_ADD_REVIEW_WRITE = '/studio/add-review/[slug]' as const
export const SCREEN_STUDIO_ADD_REVIEW_CREATE = '/studio/add-review/create' as const
export const SCREEN_STUDIO_ADD_REVIEW_SUCCESS = '/studio/add-review/success' as const
export const SCREEN_STUDIO_REVIEW_LISTING = '/studio/review-listing' as const
export const SCREEN_STUDIO_EDIT_REVIEW = '/studio/edit-review/[id]' as const

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

export const SCREEN_OWN_PROFILE = '/profile' as const
export const SCREEN_EDIT_PROFILE = '/profile/edit' as const
export const SCREEN_PUBLIC_PROFILE = '/profile/[username]' as const

/** Build the public profile path for a given username. */
export function publicProfilePath(username: string): string {
  return `/profile/${encodeURIComponent(username)}`
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
