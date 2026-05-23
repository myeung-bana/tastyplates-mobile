/** Normalize API / JSON rating values (string or number) for display. */
export function coerceRatingNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n) || n <= 0) return null
  return n
}

/** One-decimal display string, or null when not showable. */
export function formatRatingValue(value: number | string | null | undefined): string | null {
  const n = coerceRatingNumber(value)
  if (n == null) return null
  return n.toFixed(1)
}

export function hasDisplayableRating(value: number | null | undefined): boolean {
  return formatRatingValue(value) != null
}
