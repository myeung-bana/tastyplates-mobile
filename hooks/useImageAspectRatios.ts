import { useEffect, useState } from 'react'
import { Image } from 'react-native'

import { REVIEW_IMAGE_DEFAULT_ASPECT } from '@/lib/reviewImageLayout'

/**
 * Loads width/height for each URI via `Image.getSize`.
 * Returns width/height (aspect ratio) per URI; missing entries are still loading.
 */
export function useImageAspectRatios(uris: string[]): Record<string, number> {
  const [ratios, setRatios] = useState<Record<string, number>>({})
  const urisKey = uris.join('\0')

  useEffect(() => {
    if (!uris.length) {
      setRatios({})
      return
    }

    let cancelled = false
    setRatios({})

    for (const uri of uris) {
      Image.getSize(
        uri,
        (width, height) => {
          if (cancelled || width <= 0 || height <= 0) return
          setRatios((prev) => ({ ...prev, [uri]: width / height }))
        },
        () => {
          if (cancelled) return
          setRatios((prev) => ({ ...prev, [uri]: REVIEW_IMAGE_DEFAULT_ASPECT }))
        },
      )
    }

    return () => {
      cancelled = true
    }
  }, [urisKey])

  return ratios
}
