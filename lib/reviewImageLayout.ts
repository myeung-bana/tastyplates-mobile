/** Default when dimensions are unknown (slightly wider than square). */
export const REVIEW_IMAGE_DEFAULT_ASPECT = 16 / 11

/** width / height — clamp so portrait and landscape stay readable on phone. */
export function clampReviewImageAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return REVIEW_IMAGE_DEFAULT_ASPECT
  return Math.min(Math.max(aspect, 0.65), 1.9)
}

/** Full-bleed width; height derived from aspect (width / height = aspect → height = width / aspect). */
export function reviewImageHeightForWidth(
  layoutWidth: number,
  aspect: number,
  maxHeight?: number,
): number {
  const clamped = clampReviewImageAspect(aspect)
  const raw = layoutWidth / clamped
  if (maxHeight == null || !Number.isFinite(maxHeight)) return raw
  return Math.min(raw, maxHeight)
}
