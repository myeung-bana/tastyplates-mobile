import { useCallback, useState } from 'react'
import {
  FlatList,
  Image,
  Pressable,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ImageFallback } from '@/components/brand/ImageFallback'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { ImageGalleryLightbox } from '@/components/ui/ImageGalleryChrome'
import { BORDER_SUBTLE, SURFACE_CARD, SURFACE_FOG, TEXT_HEADING } from '@/constants/brand'

const HERO_HEIGHT = 300

function FloatingButton({
  icon,
  label,
  onPress,
}: {
  icon: AppIconName
  label: string
  onPress: () => void
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        void Haptics.selectionAsync()
        onPress()
      }}
      className="items-center justify-center active:opacity-80"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: BORDER_SUBTLE,
        backgroundColor: 'rgba(252,252,252,0.92)',
      }}
    >
      <AppIcon name={icon} size={20} color={TEXT_HEADING} />
    </Pressable>
  )
}

/**
 * Full-bleed photo carousel for restaurant detail (design S5): 300pt tall, floating back and
 * share buttons over the photo, pill page dots, tap to open the lightbox.
 */
export function RestaurantImageCarousel({
  images,
  title,
  onBack,
  onShare,
}: {
  images: string[]
  title: string
  onBack?: () => void
  onShare?: () => void
}): JSX.Element {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [index, setIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width)
      if (next !== index && next >= 0 && next < images.length) setIndex(next)
    },
    [images.length, index, width],
  )

  const height = HERO_HEIGHT + insets.top

  return (
    <>
      <View style={{ height, backgroundColor: SURFACE_FOG }}>
        {images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(uri, i) => `${i}-${uri}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item, index: i }) => (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={`${title} photo ${i + 1} of ${images.length}`}
                onPress={() => setLightboxOpen(true)}
                style={{ width, height }}
              >
                <Image source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
              </Pressable>
            )}
          />
        ) : (
          <ImageFallback style={{ width, height }} />
        )}

        {onBack || onShare ? (
          <View
            pointerEvents="box-none"
            className="absolute flex-row justify-between"
            style={{ top: insets.top + 8, left: 16, right: 16 }}
          >
            {onBack ? <FloatingButton icon="chevron-left" label="Back" onPress={onBack} /> : <View />}
            {onShare ? <FloatingButton icon="share-2" label={`Share ${title}`} onPress={onShare} /> : null}
          </View>
        ) : null}

        {images.length > 1 ? (
          <View pointerEvents="none" className="absolute flex-row justify-center" style={{ bottom: 14, left: 0, right: 0, gap: 6 }}>
            {images.map((uri, i) => (
              <View
                key={`${i}-${uri}`}
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? SURFACE_CARD : 'rgba(252,252,252,0.6)',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      {images.length > 0 ? (
        <ImageGalleryLightbox
          visible={lightboxOpen}
          images={images}
          currentIndex={index}
          onIndexChange={setIndex}
          onClose={() => setLightboxOpen(false)}
          title={title}
        />
      ) : null}
    </>
  )
}
