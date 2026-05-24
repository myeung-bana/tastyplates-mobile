export interface ReviewImage {
  id: string
  url: string
  thumbnail_url?: string
  alt_text?: string
  display_order: number
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
