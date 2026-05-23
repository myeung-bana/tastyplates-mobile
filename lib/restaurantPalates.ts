import { labelForPalateKey } from '@/lib/palateLabels'

interface NamedChip {
  name: string
}

interface SlugChip {
  slug: string
}

/** Extract display names from JSON tag arrays (`palates`, `cuisines`, `categories`). */
export function extractRestaurantTagNames(field: unknown): string[] {
  if (!Array.isArray(field)) return []
  const names: string[] = []
  for (const el of field) {
    if (el && typeof el === 'object' && 'name' in el) {
      const n = (el as NamedChip).name
      if (typeof n === 'string' && n.trim()) names.push(n.trim())
    } else if (typeof el === 'string' && el.trim()) {
      names.push(el.trim())
    }
  }
  return names
}

/** Human-readable palate labels for restaurant cards (name or slug → `labelForPalateKey`). */
export function restaurantPalateDisplayLabels(palates: unknown): string[] {
  if (!Array.isArray(palates)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const el of palates) {
    let label: string | null = null
    if (typeof el === 'string' && el.trim()) {
      label = labelForPalateKey(el.trim())
    } else if (el && typeof el === 'object') {
      if ('name' in el && typeof (el as NamedChip).name === 'string') {
        label = (el as NamedChip).name.trim()
      } else if ('slug' in el && typeof (el as SlugChip).slug === 'string') {
        label = labelForPalateKey((el as SlugChip).slug.trim())
      }
    }
    if (label && !seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
  }
  return out
}
