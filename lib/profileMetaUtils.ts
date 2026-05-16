/** Read trimmed string metadata from `users.metadata`. */
export function readStringMeta(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!meta) return null
  const v = meta[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
