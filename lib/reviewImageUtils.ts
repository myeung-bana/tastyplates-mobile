export interface ReviewImage {
  id: string
  url: string
  thumbnail_url?: string
  alt_text?: string
  display_order: number
}

/** Parse stored review `images` JSON into editable `ReviewImage` rows. */
export function parseReviewImages(images: unknown): ReviewImage[] {
  if (!Array.isArray(images)) return []
  const out: ReviewImage[] = []
  for (let i = 0; i < images.length; i++) {
    const item = images[i]
    if (typeof item === 'string' && item.trim().startsWith('http')) {
      const url = item.trim()
      out.push({
        id: `img-existing-${i}`,
        url,
        thumbnail_url: url,
        alt_text: '',
        display_order: i,
      })
      continue
    }
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const url = typeof o.url === 'string' ? o.url.trim() : ''
    if (!url.startsWith('http')) continue
    out.push({
      id: typeof o.id === 'string' ? o.id : `img-existing-${i}`,
      url,
      thumbnail_url: typeof o.thumbnail_url === 'string' ? o.thumbnail_url : url,
      alt_text: typeof o.alt_text === 'string' ? o.alt_text : '',
      display_order: typeof o.display_order === 'number' ? o.display_order : i,
    })
  }
  return out
}

/** Re-index `display_order` after add/remove. */
export function normalizeReviewImageOrder(images: ReviewImage[]): ReviewImage[] {
  return images.map((img, index) => ({ ...img, display_order: index }))
}

/** Map uploaded public URLs to Hasura review `images` JSON shape. */
export function transformUrlsToReviewImages(urls: string[]): ReviewImage[] {
  if (!urls.length) return []
  return urls.map((url, index) => ({
    id: `img-${Date.now()}-${index}`,
    url,
    thumbnail_url: url,
    alt_text: '',
    display_order: index,
  }))
}
