import { useCallback, useRef } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { useTabBarScrollOptional } from '@/contexts/TabBarScrollContext'

const SCROLL_DELTA_THRESHOLD = 6
const TOP_EXPAND_OFFSET = 4

type Options = {
  /** When false, scroll events do not collapse the tab bar. */
  enabled?: boolean
}

/**
 * Attach to primary vertical scroll views on tab roots (Home, Explore list, Activity).
 * Scrolling up compacts the pill; scrolling down expands it (Instagram-style).
 */
export function useTabBarScrollHandler(options: Options = {}) {
  const { enabled = true } = options
  const tabBarScroll = useTabBarScrollOptional()
  const lastYRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return
      tabBarScroll?.expandTabBar()
      lastYRef.current = 0
    }, [enabled, tabBarScroll]),
  )

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enabled || !tabBarScroll || !tabBarScroll.collapseEnabled) return

      const y = event.nativeEvent.contentOffset.y

      if (y <= TOP_EXPAND_OFFSET) {
        tabBarScroll.expandTabBar()
        lastYRef.current = y
        return
      }

      const dy = y - lastYRef.current
      if (dy > SCROLL_DELTA_THRESHOLD) {
        tabBarScroll.reportScrollDirection('up')
      } else if (dy < -SCROLL_DELTA_THRESHOLD) {
        tabBarScroll.reportScrollDirection('down')
      }

      lastYRef.current = y
    },
    [enabled, tabBarScroll],
  )

  return {
    onScroll,
    scrollEventThrottle: 16 as const,
  }
}
