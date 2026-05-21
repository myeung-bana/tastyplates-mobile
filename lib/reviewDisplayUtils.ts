/** All HTTP image URLs from review `images` JSON (strings or `{ url }`), capped at `max`. */
export function reviewImageUris(images: unknown, max = 8): string[] {
  const out: string[] = []
  if (images == null || !Array.isArray(images)) return out
  for (const item of images) {
    if (out.length >= max) break
    if (typeof item === 'string' && item.trim().startsWith('http')) {
      out.push(item.trim())
    } else if (item && typeof item === 'object' && 'url' in item) {
      const u = (item as { url?: unknown }).url
      if (typeof u === 'string' && u.trim().startsWith('http')) out.push(u.trim())
    }
  }
  return out
}

/** First image URL from review `images` JSON (strings or `{ url }`). */
export function firstReviewImageUri(images: unknown, fallback: string): string {
  if (images == null) return fallback
  if (Array.isArray(images)) {
    for (const item of images) {
      if (typeof item === 'string' && item.trim().startsWith('http')) return item.trim()
      if (item && typeof item === 'object' && 'url' in item) {
        const u = (item as { url?: unknown }).url
        if (typeof u === 'string' && u.trim().startsWith('http')) return u.trim()
      }
    }
    return fallback
  }
  return fallback
}

/** Up to `max` hashtag labels for chips (array of strings or JSON string). */
export function reviewHashtagLabels(hashtags: unknown, max = 3): string[] {
  if (hashtags == null) return []
  let list: unknown[] = []
  if (Array.isArray(hashtags)) list = hashtags
  else if (typeof hashtags === 'string') {
    try {
      const parsed = JSON.parse(hashtags) as unknown
      if (Array.isArray(parsed)) list = parsed
      else if (typeof parsed === 'string' && parsed.trim())
        return normalizeTag(parsed, max)
    } catch {
      const parts = hashtags.split(/[,\s]+/).filter(Boolean)
      list = parts
    }
  }
  const out: string[] = []
  for (const el of list) {
    if (typeof el === 'string' && el.trim()) {
      const t = el.trim().replace(/^#/, '')
      if (t && !out.includes(t)) out.push(t)
    } else if (el && typeof el === 'object' && 'name' in el) {
      const n = (el as { name?: unknown }).name
      if (typeof n === 'string' && n.trim()) out.push(n.trim().replace(/^#/, ''))
    }
    if (out.length >= max) break
  }
  return out.slice(0, max)
}

function normalizeTag(raw: string, max: number): string[] {
  const t = raw.trim().replace(/^#/, '')
  return t ? [t].slice(0, max) : []
}
