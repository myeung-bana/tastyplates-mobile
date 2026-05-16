import { useMemo, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from 'react-native'

import { BRAND_PRIMARY } from '@/constants/brand'

const { width: SCREEN_W } = Dimensions.get('window')

export function RestaurantImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0)
  const w = SCREEN_W

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const i = Math.round(x / w)
    if (i !== index && i >= 0 && i < images.length) setIndex(i)
  }

  const height = useMemo(() => w * 0.75, [w])

  if (images.length === 0) return null

  return (
    <>
      <View className="relative" style={{ height }}>
        <FlatList
          data={images}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ height }}
          renderItem={({ item }) => (
            <Pressable style={{ width: w, height }} className="bg-gray-100">
              <Image
                source={{ uri: item }}
                accessibilityLabel={`${title} photo`}
                style={{ width: w, height }}
                resizeMode="cover"
              />
            </Pressable>
          )}
        />

        <View className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-1">
          <Text className="text-xs text-white">
            {index + 1}/{images.length}
          </Text>
        </View>
      </View>

      {images.length > 1 ? (
        <View className="flex-row justify-center gap-1.5 py-2">
          {images.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={
                i === index
                  ? { width: 16, height: 6, backgroundColor: BRAND_PRIMARY }
                  : { width: 6, height: 6, backgroundColor: '#d1d5db' }
              }
            />
          ))}
        </View>
      ) : null}
    </>
  )
}
