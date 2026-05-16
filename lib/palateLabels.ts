import { palateOptions } from '@/constants/palateOptions'

/** Human-readable label for a palate slug, or the raw key if unknown. */
export function labelForPalateKey(key: string | null): string {
  if (!key) return 'All cuisines'
  for (const region of palateOptions) {
    if (region.key === key) return `All ${region.label}`
    const child = region.children.find((c) => c.key === key)
    if (child) return child.label
  }
  return key
}
