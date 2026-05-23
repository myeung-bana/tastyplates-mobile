/** True when palate param is empty or means “no filter”. */
export function isNoPalateFilter(palate: string | null | undefined): boolean {
  if (palate == null) return true
  const t = palate.trim().toLowerCase()
  return t.length === 0 || t === 'all'
}
