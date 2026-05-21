import { palateOptions } from '@/constants/palateOptions'

/** Flatten region → cuisine children for onboarding palate grid (slug + label). */
export function flattenPalateSlugOptions(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  for (const region of palateOptions) {
    for (const c of region.children) {
      out.push({ key: c.key, label: c.label })
    }
  }
  return out
}
