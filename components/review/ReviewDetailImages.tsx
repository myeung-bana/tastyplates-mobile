import { useEffect, useMemo, useState } from 'react'
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

import { useImageAspectRatios } from '@/hooks/useImageAspectRatios'
import {
  clampReviewImageAspect,
  REVIEW_IMAGE_DEFAULT_ASPECT,
  reviewImageHeightForWidth,
} from '@/lib/reviewImageLayout'

const GALLERY_MAX_HEIGHT_RATIO = 0.72

interface ReviewDetailImagesProps {
  images: string[]
  /** Shown when `images` is empty. */
  fallbackUri?: string
}

function ReviewDetailImageFrame({
  uri,
  layoutWidth,
  aspect,
  maxHeight,
}: {
  uri: string
  layoutWidth: number
  aspect: number
  maxHeight: number
}): JSX.Element {
  const clamped = clampReviewImageAspect(aspect)
  const height = reviewImageHeightForWidth(layoutWidth, clamped, maxHeight)

  return (
    <View style={{ width: layoutWidth, height, backgroundColor: '#f3f4f6' }}>
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri }}
        style={{ width: layoutWidth, height }}
        resizeMode="cover"
      />
    </View>
  )
}

/**
 * Review detail hero — adapts height per photo (portrait vs landscape).
 * Multiple images: horizontal paging gallery with per-slide aspect.
 */
export function ReviewDetailImages({
  images,
  fallbackUri,
}: ReviewDetailImagesProps): JSX.Element | null {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const layoutWidth = windowWidth
  const maxFrameHeight = windowHeight * GALLERY_MAX_HEIGHT_RATIO

  const uris = useMemo(() => {
    const list = images.filter((u) => u.trim().length > 0)
    if (list.length > 0) return list
    if (fallbackUri?.trim()) return [fallbackUri.trim()]
    return []
  }, [images, fallbackUri])

  const aspects = useImageAspectRatios(uris)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [uris.join('\0')])

  const slideHeights = useMemo(
    () =>
      uris.map((uri) => {
        const aspect = aspects[uri] ?? REVIEW_IMAGE_DEFAULT_ASPECT
        return reviewImageHeightForWidth(layoutWidth, aspect, maxFrameHeight)
      }),
    [uris, aspects, layoutWidth, maxFrameHeight],
  )

  const galleryHeight = useMemo(() => {
    if (slideHeights.length === 0) return 0
    if (slideHeights.length === 1) return slideHeights[0]!
    return Math.max(...slideHeights)
  }, [slideHeights])

  if (uris.length === 0) return null

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const next = Math.round(x / layoutWidth)
    if (next !== pageIndex && next >= 0 && next < uris.length) setPageIndex(next)
  }

  if (uris.length === 1) {
    const uri = uris[0]!
    const aspect = aspects[uri] ?? REVIEW_IMAGE_DEFAULT_ASPECT
    return (
      <ReviewDetailImageFrame
        uri={uri}
        layoutWidth={layoutWidth}
        aspect={aspect}
        maxHeight={maxFrameHeight}
      />
    )
  }

  return (
    <View>
      <View style={{ width: layoutWidth, height: galleryHeight, backgroundColor: '#f3f4f6' }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {uris.map((uri, index) => {
            const aspect = aspects[uri] ?? REVIEW_IMAGE_DEFAULT_ASPECT
            const frameHeight = slideHeights[index] ?? galleryHeight
            const topPad = Math.max(0, (galleryHeight - frameHeight) / 2)
            return (
              <View
                key={`${uri}-${index}`}
                style={{ width: layoutWidth, height: galleryHeight, justifyContent: 'flex-start' }}
              >
                <View style={{ paddingTop: topPad }}>
                  <ReviewDetailImageFrame
                    uri={uri}
                    layoutWidth={layoutWidth}
                    aspect={aspect}
                    maxHeight={maxFrameHeight}
                  />
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
      <View className="flex-row items-center justify-center gap-1.5 py-2">
        {uris.map((uri, index) => (
          <View
            key={`dot-${uri}-${index}`}
            style={{
              width: index === pageIndex ? 8 : 6,
              height: index === pageIndex ? 8 : 6,
              borderRadius: 4,
              backgroundColor: index === pageIndex ? '#31343F' : '#d1d5db',
            }}
          />
        ))}
        <Text className="ml-2 text-xs" style={{ color: '#6b7280' }}>
          {pageIndex + 1} / {uris.length}
        </Text>
      </View>
    </View>
  )
}
