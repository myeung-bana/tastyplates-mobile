import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TOAST_PILL_CONTAINER, TOAST_PILL_TEXT } from '@/constants/toast'
import { subscribeToToasts, type ToastPayload } from '@/utils/toast'

export function ToastHost() {
  const insets = useSafeAreaInsets()
  const [current, setCurrent] = useState<ToastPayload | null>(null)
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => subscribeToToasts(setCurrent), [])

  useEffect(() => {
    if (!current) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [current, opacity])

  if (!current) return null

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.host, { top: insets.top + 12, opacity }]}
    >
      <View style={TOAST_PILL_CONTAINER}>
        <Text style={TOAST_PILL_TEXT}>{current.message}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
})
