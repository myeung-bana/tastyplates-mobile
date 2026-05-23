/** One-decimal display string, or null when not showable. */
export function formatRatingValue(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(Number(value)) || Number(value) <= 0) return null
  return Number(value).toFixed(1)
}

export function hasDisplayableRating(value: number | null | undefined): boolean {
  return formatRatingValue(value) != null
}
