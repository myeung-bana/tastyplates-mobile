import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native'

import {
  ImageGalleryCounterBadge,
  ImageGalleryLightbox,
  ImageGalleryPageDots,
} from '@/components/ui/ImageGalleryChrome'
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
  onPress,
  accessibilityLabel,
}: {
  uri: string
  layoutWidth: number
  aspect: number
  maxHeight: number
  onPress?: () => void
  accessibilityLabel?: string
}): JSX.Element {
  const clamped = clampReviewImageAspect(aspect)
  const height = reviewImageHeightForWidth(layoutWidth, clamped, maxHeight)

  const image = (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri }}
      accessibilityLabel={accessibilityLabel}
      style={{ width: layoutWidth, height }}
      resizeMode="cover"
    />
  )

  if (!onPress) {
    return (
      <View style={{ width: layoutWidth, height, backgroundColor: '#f3f4f6' }}>{image}</View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ width: layoutWidth, height, backgroundColor: '#f3f4f6' }}
    >
      {image}
    </Pressable>
  )
}

/**
 * Review detail hero — portrait/landscape-aware heights with gallery chrome
 * (counter badge, dot indicators, lightbox) matching restaurant detail.
 */
export function ReviewDetailImages({
  images,
  fallbackUri,
}: ReviewDetailImagesProps): JSX.Element | null {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const layoutWidth = windowWidth
  const maxFrameHeight = windowHeight * GALLERY_MAX_HEIGHT_RATIO
  const scrollRef = useRef<ScrollView>(null)

  const uris = useMemo(() => {
    const list = images.filter((u) => u.trim().length > 0)
    if (list.length > 0) return list
    if (fallbackUri?.trim()) return [fallbackUri.trim()]
    return []
  }, [images, fallbackUri])

  const aspects = useImageAspectRatios(uris)
  const [pageIndex, setPageIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    setPageIndex(0)
    scrollRef.current?.scrollTo({ x: 0, animated: false })
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

  const openLightbox = useCallback((index: number) => {
    setPageIndex(index)
    setLightboxOpen(true)
  }, [])

  const goToPage = useCallback(
    (index: number) => {
      setPageIndex(index)
      scrollRef.current?.scrollTo({ x: layoutWidth * index, animated: true })
    },
    [layoutWidth],
  )

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const next = Math.round(x / layoutWidth)
    if (next !== pageIndex && next >= 0 && next < uris.length) setPageIndex(next)
  }

  if (uris.length === 0) return null

  const renderSlide = (uri: string, index: number) => {
    const aspect = aspects[uri] ?? REVIEW_IMAGE_DEFAULT_ASPECT
    const frameHeight = slideHeights[index] ?? galleryHeight
    const topPad = uris.length > 1 ? Math.max(0, (galleryHeight - frameHeight) / 2) : 0

    return (
      <View
        key={`${uri}-${index}`}
        style={
          uris.length > 1
            ? { width: layoutWidth, height: galleryHeight, justifyContent: 'flex-start' }
            : undefined
        }
      >
        <View style={uris.length > 1 ? { paddingTop: topPad } : undefined}>
          <ReviewDetailImageFrame
            uri={uri}
            layoutWidth={layoutWidth}
            aspect={aspect}
            maxHeight={maxFrameHeight}
            onPress={() => openLightbox(index)}
            accessibilityLabel={`Review photo ${index + 1} of ${uris.length}`}
          />
        </View>
      </View>
    )
  }

  return (
    <>
      <View className="relative w-full" style={{ height: galleryHeight, backgroundColor: '#f3f4f6' }}>
        {uris.length === 1 ? (
          renderSlide(uris[0]!, 0)
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={{ height: galleryHeight }}
          >
            {uris.map((uri, index) => renderSlide(uri, index))}
          </ScrollView>
        )}

        <ImageGalleryCounterBadge
          currentIndex={pageIndex}
          total={uris.length}
          onPress={() => openLightbox(pageIndex)}
        />

        <ImageGalleryPageDots
          count={uris.length}
          currentIndex={pageIndex}
          onSelect={goToPage}
        />
      </View>

      <ImageGalleryLightbox
        visible={lightboxOpen}
        images={uris}
        currentIndex={pageIndex}
        onIndexChange={setPageIndex}
        onClose={() => setLightboxOpen(false)}
        title="Review photo"
      />
    </>
  )
}
