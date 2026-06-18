import { parseProfilePalates } from '@/lib/profileFormatting'
import {
  publicProfileFromAuthorFields,
  resolvePublicProfileRouteSegment,
} from '@/lib/publicProfileNavigation'
import type { TrendingReviewAuthor } from '@/services/homeReviewsService'
import {
  normalizeLegacyProfileAvatar,
  type RestaurantUserRow,
} from '@/services/restaurantUserService'

export type ReviewAuthorProfileLike = TrendingReviewAuthor | null | undefined

/** displayName → @username → email local part → fallback (home review cards). */
export function resolveReviewAuthorLabel(
  profile: ReviewAuthorProfileLike,
  fallback = 'Member',
): string {
  const dn = profile?.user?.displayName?.trim()
  if (dn) return dn
  const u = profile?.username?.trim()
  if (u) return u.startsWith('@') ? u : `@${u}`
  const email = profile?.user?.email?.trim()
  if (email && email.includes('@')) return email.split('@')[0] ?? fallback
  return fallback
}

export function resolveReviewAuthorAvatarUrl(profile: ReviewAuthorProfileLike): string | null {
  const url = profile?.user?.avatarUrl?.trim()
  return url || null
}

export function resolveReviewAuthorPalates(
  profile: ReviewAuthorProfileLike,
  reviewPalates?: unknown,
  limit = 2,
): string[] {
  const fromProfile = parseProfilePalates(profile?.palates)
  if (fromProfile.length > 0) return fromProfile.slice(0, limit)
  return parseProfilePalates(reviewPalates).slice(0, limit)
}

export type ReviewAuthorPresentation = {
  label: string
  avatarUrl: string | null
  palates: string[]
  canOpenProfile: boolean
}

type ReviewAuthorSource = {
  author_id: string
  AuthorProfile?: ReviewAuthorProfileLike
  palates?: unknown
}

/** Unified author chrome for review list + detail (AuthorProfile first, optional full row). */
export function resolveReviewAuthorPresentation(
  review: ReviewAuthorSource,
  authorRow?: RestaurantUserRow | null,
): ReviewAuthorPresentation {
  const label = authorRow
    ? labelFromRestaurantUserRow(authorRow, review.AuthorProfile)
    : resolveReviewAuthorLabel(review.AuthorProfile)

  const avatarUrl = authorRow
    ? normalizeLegacyProfileAvatar(authorRow.avatarUrl ?? null, authorRow.profile_image) ??
      resolveReviewAuthorAvatarUrl(review.AuthorProfile)
    : resolveReviewAuthorAvatarUrl(review.AuthorProfile)

  const palates = authorRow
    ? (() => {
        const fromRow = parseProfilePalates(authorRow.palates)
        return (fromRow.length > 0
          ? fromRow
          : resolveReviewAuthorPalates(review.AuthorProfile, review.palates, 99)
        ).slice(0, 2)
      })()
    : resolveReviewAuthorPalates(review.AuthorProfile, review.palates)

  const canOpenProfile = Boolean(
    resolvePublicProfileRouteSegment(
      publicProfileFromAuthorFields(review.author_id, review.AuthorProfile),
    ),
  )

  return { label, avatarUrl, palates, canOpenProfile }
}

function labelFromRestaurantUserRow(
  author: RestaurantUserRow,
  profileFallback: ReviewAuthorProfileLike,
): string {
  const u = author.username?.trim()
  if (u) return u.startsWith('@') ? u : `@${u}`
  const dn = author.display_name?.trim()
  if (dn) return dn
  const email = author.email?.trim()
  if (email?.includes('@')) return email.split('@')[0] ?? 'Member'
  return resolveReviewAuthorLabel(profileFallback)
}
