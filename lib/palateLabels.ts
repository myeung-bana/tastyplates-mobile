import { palateOptions } from '@/constants/palateOptions'

/** Human-readable label for a palate slug; unknown slugs are title-cased. */
export function labelForPalateKey(key: string | null): string {
  if (!key) return 'All cuisines'
  for (const region of palateOptions) {
    if (region.key === key) return `All ${region.label}`
    const child = region.children.find((c) => c.key === key)
    if (child) return child.label
  }
  // Cuisines outside the palate taxonomy (e.g. Home's Thai / Vietnamese shortcuts): title-case the slug.
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
}
