import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
} from 'react-native'

import {
  ImageGalleryCounterBadge,
  ImageGalleryLightbox,
  ImageGalleryPageDots,
} from '@/components/ui/ImageGalleryChrome'

const { width: SCREEN_W } = Dimensions.get('window')

export function RestaurantImageCarousel({
  images,
  title,
}: {
  images: string[]
  title: string
}): JSX.Element | null {
  const listRef = useRef<FlatList<string>>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const height = useMemo(
    () => Math.max(256, Math.min(SCREEN_W * 0.56, 440)),
    [],
  )

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const i = Math.round(x / SCREEN_W)
    if (i !== selectedImage && i >= 0 && i < images.length) setSelectedImage(i)
  }

  const openLightbox = useCallback((index: number) => {
    setSelectedImage(index)
    setLightboxOpen(true)
  }, [])

  const goToPage = useCallback((index: number) => {
    setSelectedImage(index)
    listRef.current?.scrollToIndex({ index, animated: true })
  }, [])

  if (images.length === 0) return null

  return (
    <>
      <View className="relative w-full" style={{ height }}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ height }}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <Pressable
              style={{ width: SCREEN_W, height }}
              className="bg-gray-100"
              onPress={() => openLightbox(index)}
              accessibilityRole="button"
              accessibilityLabel={`Open photo gallery for ${title}`}
            >
              <Image
                source={{ uri: item }}
                accessibilityLabel={`${title} photo ${index + 1}`}
                style={{ width: SCREEN_W, height }}
                resizeMode="cover"
              />
            </Pressable>
          )}
        />

        <ImageGalleryCounterBadge
          currentIndex={selectedImage}
          total={images.length}
          onPress={() => openLightbox(selectedImage)}
        />

        <ImageGalleryPageDots
          count={images.length}
          currentIndex={selectedImage}
          onSelect={goToPage}
        />
      </View>

      <ImageGalleryLightbox
        visible={lightboxOpen}
        images={images}
        currentIndex={selectedImage}
        onIndexChange={setSelectedImage}
        onClose={() => setLightboxOpen(false)}
        title={title}
      />
    </>
  )
}
