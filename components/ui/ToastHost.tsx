import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TOAST_PILL_CONTAINER, TOAST_PILL_TEXT } from '@/constants/toast'
import { BRAND_PRIMARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'
import { hideToast, subscribeToToasts, type ToastPayload } from '@/utils/toast'

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
      pointerEvents={current.action ? 'box-none' : 'none'}
      style={[styles.host, { top: insets.top + 12, opacity }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[TOAST_PILL_CONTAINER, current.action ? styles.withAction : null]}>
        <Text style={[TOAST_PILL_TEXT, current.action ? { textAlign: 'left', flexShrink: 1 } : null]}>
          {current.message}
        </Text>
        {current.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              const action = current.action
              hideToast()
              action?.onPress()
            }}
          >
            <Text style={{ fontFamily: FONT.bodySemibold, fontSize: 14, color: BRAND_PRIMARY }}>
              {current.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  withAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 16,
  },
})
