import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'

export interface ReplySkeletonProps {
  count?: number
}

function SkeletonRow({ opacity }: { opacity: Animated.Value }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
      <Animated.View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#e5e7eb',
          opacity,
        }}
      />
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            width: 80,
            height: 12,
            borderRadius: 4,
            backgroundColor: '#e5e7eb',
            opacity,
          }}
        />
        <Animated.View
          style={{
            width: '100%',
            height: 12,
            marginTop: 6,
            borderRadius: 4,
            backgroundColor: '#f3f4f6',
            opacity,
          }}
        />
        <Animated.View
          style={{
            width: '75%',
            height: 12,
            marginTop: 4,
            borderRadius: 4,
            backgroundColor: '#f3f4f6',
            opacity,
          }}
        />
      </View>
    </View>
  )
}

export function ReplySkeleton({ count = 3 }: ReplySkeletonProps): JSX.Element {
  const pulse = useRef(new Animated.Value(0.55)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonRow key={`reply-skeleton-${index}`} opacity={pulse} />
      ))}
    </View>
  )
}
