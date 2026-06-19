import { useCallback } from 'react'
import { AppIcon } from '@/components/ui/AppIcon'
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_W } = Dimensions.get('window')

export const IMAGE_GALLERY_COUNTER_BG = 'rgba(0,0,0,0.55)'

export function ImageGalleryCounterBadge({
  currentIndex,
  total,
  onPress,
  className,
}: {
  currentIndex: number
  total: number
  onPress?: () => void
  className?: string
}): JSX.Element {
  const label = `${currentIndex + 1}/${total}`
  const inner = (
    <View className="rounded-md px-2.5 py-1.5" style={{ backgroundColor: IMAGE_GALLERY_COUNTER_BG }}>
      <Text className="font-neusans text-sm font-medium text-white">{label}</Text>
    </View>
  )

  if (!onPress) {
    return <View className={className ?? 'absolute right-4 top-4 z-[2]'}>{inner}</View>
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Photo ${currentIndex + 1} of ${total}. Open gallery`}
      onPress={onPress}
      className={className ?? 'absolute right-4 top-4 z-[2]'}
    >
      {inner}
    </Pressable>
  )
}

export function ImageGalleryPageDots({
  count,
  currentIndex,
  onSelect,
}: {
  count: number
  currentIndex: number
  onSelect?: (index: number) => void
}): JSX.Element | null {
  if (count <= 1) return null

  return (
    <View className="absolute bottom-4 left-0 right-0 z-[2] flex-row items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => {
        const active = index === currentIndex
        const dot = (
          <View
            className={`h-2 w-2 rounded-full ${active ? 'bg-white' : 'bg-white/50'}`}
          />
        )

        if (!onSelect) {
          return <View key={index}>{dot}</View>
        }

        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Show image ${index + 1}`}
            onPress={() => onSelect(index)}
            hitSlop={6}
          >
            {dot}
          </Pressable>
        )
      })}
    </View>
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
    icon === 'back' ? 'chevron-left' : icon === 'forward' ? 'chevron-right' : 'x'
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
      <AppIcon name={name} size={iconSize} color="#fff" />
    </Pressable>
  )
}

export function ImageGalleryLightbox({
  visible,
  images,
  currentIndex,
  onIndexChange,
  onClose,
  title = 'Photo',
}: {
  visible: boolean
  images: string[]
  currentIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
  title?: string
}): JSX.Element {
  const insets = useSafeAreaInsets()

  const goPrev = useCallback(() => {
    onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1)
  }, [currentIndex, images.length, onIndexChange])

  const goNext = useCallback(() => {
    onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1)
  }, [currentIndex, images.length, onIndexChange])

  const uri = images[currentIndex]

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <View className="absolute left-4 z-10" style={{ top: insets.top + 8 }}>
          <CircleNavButton icon="close" size={40} iconSize={24} onPress={onClose} />
        </View>

        <Text
          className="absolute right-4 z-10 text-lg font-medium text-white"
          style={{ top: insets.top + 16 }}
        >
          {currentIndex + 1} / {images.length}
        </Text>

        <View className="flex-1 items-center justify-center">
          {uri ? (
            <Image
              source={{ uri }}
              accessibilityLabel={`${title} ${currentIndex + 1}`}
              style={{ width: SCREEN_W, height: '100%' }}
              resizeMode="contain"
            />
          ) : null}
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
              {images.map((imageUri, index) => (
                <Pressable
                  key={`${index}-${imageUri}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View image ${index + 1}`}
                  onPress={() => onIndexChange(index)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    index === currentIndex ? 'border-white' : 'border-transparent'
                  }`}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: 64, height: 64 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>
    </Modal>
  )
}
