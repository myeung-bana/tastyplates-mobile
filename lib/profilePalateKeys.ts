import { palateOptions } from '@/constants/palateOptions'
import { capitalizePhrase, parseProfilePalates } from '@/lib/profileFormatting'
import { flattenPalateSlugOptions } from '@/lib/onboardingPalates'

const SLUG_KEYS = new Set(flattenPalateSlugOptions().map((o) => o.key))

const LABEL_TO_KEY = (() => {
  const map = new Map<string, string>()
  for (const region of palateOptions) {
    map.set(region.label.toLowerCase(), region.key)
    for (const c of region.children) {
      map.set(c.label.toLowerCase(), c.key)
      map.set(c.key.toLowerCase(), c.key)
    }
  }
  return map
})()

/** Map stored `palates` JSON (slugs or labels) to cuisine slug keys for the picker. */
export function palateKeysFromProfile(raw: unknown): string[] {
  if (raw == null) return []

  const tryKey = (s: string): string | null => {
    const t = s.trim()
    if (!t) return null
    if (SLUG_KEYS.has(t)) return t
    return LABEL_TO_KEY.get(t.toLowerCase()) ?? LABEL_TO_KEY.get(capitalizePhrase(t).toLowerCase()) ?? null
  }

  const out: string[] = []

  if (Array.isArray(raw)) {
    for (const el of raw) {
      if (typeof el === 'string') {
        const k = tryKey(el)
        if (k && !out.includes(k)) out.push(k)
      } else if (el && typeof el === 'object' && 'name' in el) {
        const n = (el as { name?: unknown }).name
        if (typeof n === 'string') {
          const k = tryKey(n)
          if (k && !out.includes(k)) out.push(k)
        }
      }
    }
    return out
  }

  for (const label of parseProfilePalates(raw)) {
    const k = tryKey(label)
    if (k && !out.includes(k)) out.push(k)
  }
  return out
}
