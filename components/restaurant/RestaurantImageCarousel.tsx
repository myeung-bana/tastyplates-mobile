import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

function CameraIcon(): JSX.Element {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="#111827"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CircleNavButton({
  onPress,
  icon,
  size = 40,
  iconSize = 20,
  style,
}: {
  onPress: () => void
  icon: 'back' | 'forward' | 'close'
  size?: number
  iconSize?: number
  style?: object
}): JSX.Element {
  const name =
    icon === 'back' ? 'chevron-back' : icon === 'forward' ? 'chevron-forward' : 'close'
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize} color="#fff" />
    </Pressable>
  )
}

export function RestaurantImageCarousel({
  images,
  title,
}: {
  images: string[]
  title: string
}): JSX.Element | null {
  const insets = useSafeAreaInsets()
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

  const goPrev = useCallback(() => {
    setSelectedImage((prev) => {
      const next = prev === 0 ? images.length - 1 : prev - 1
      listRef.current?.scrollToIndex({ index: next, animated: true })
      return next
    })
  }, [images.length])

  const goNext = useCallback(() => {
    setSelectedImage((prev) => {
      const next = prev === images.length - 1 ? 0 : prev + 1
      listRef.current?.scrollToIndex({ index: next, animated: true })
      return next
    })
  }, [images.length])

  if (images.length === 0) return null

  const seeAllLabel =
    images.length > 1 ? `See all photos (${images.length})` : 'View photo'

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

        {images.length > 1 ? (
          <>
            <View className="absolute left-4 top-1/2 z-[1]" style={{ transform: [{ translateY: -20 }] }}>
              <CircleNavButton icon="back" onPress={goPrev} />
            </View>
            <View className="absolute right-4 top-1/2 z-[1]" style={{ transform: [{ translateY: -20 }] }}>
              <CircleNavButton icon="forward" onPress={goNext} />
            </View>

            <View className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center gap-2">
              {images.map((_, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`Show image ${index + 1}`}
                  onPress={() => {
                    setSelectedImage(index)
                    listRef.current?.scrollToIndex({ index, animated: true })
                  }}
                  className={`h-2 w-2 rounded-full ${index === selectedImage ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </View>
          </>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={seeAllLabel}
          onPress={() => openLightbox(selectedImage)}
          className="absolute right-4 top-4 z-[2] flex-row items-center gap-2 rounded-lg bg-white/90 px-4 py-2.5 shadow-md"
        >
          <CameraIcon />
          <Text className="font-neusans text-[0.9375rem] font-normal text-gray-900">{seeAllLabel}</Text>
        </Pressable>
      </View>

      <Modal
        visible={lightboxOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setLightboxOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View className="absolute left-4 z-10" style={{ top: insets.top + 8 }}>
            <CircleNavButton icon="close" size={40} iconSize={24} onPress={() => setLightboxOpen(false)} />
          </View>

          <Text
            className="absolute right-4 z-10 text-lg font-medium text-white"
            style={{ top: insets.top + 16 }}
          >
            {selectedImage + 1} / {images.length}
          </Text>

          <View className="flex-1 items-center justify-center">
            <Image
              source={{ uri: images[selectedImage] }}
              accessibilityLabel={`${title} photo ${selectedImage + 1}`}
              style={{ width: SCREEN_W, height: '100%' }}
              resizeMode="contain"
            />
          </View>

          {images.length > 1 ? (
            <>
              <View
                className="absolute left-4 top-1/2 z-10"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <CircleNavButton icon="back" size={48} iconSize={24} onPress={goPrev} />
              </View>
              <View
                className="absolute right-4 top-1/2 z-10"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <CircleNavButton icon="forward" size={48} iconSize={24} onPress={goNext} />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 8,
                  paddingBottom: insets.bottom + 16,
                }}
                className="absolute bottom-0 left-0 right-0"
              >
                {images.map((uri, index) => (
                  <Pressable
                    key={`${index}-${uri}`}
                    accessibilityRole="button"
                    accessibilityLabel={`View image ${index + 1}`}
                    onPress={() => setSelectedImage(index)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                      index === selectedImage ? 'border-white' : 'border-transparent'
                    }`}
                  >
                    <Image source={{ uri }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </Modal>
    </>
  )
}
