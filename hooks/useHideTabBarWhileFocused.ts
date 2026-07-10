import { useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'

import { useTabBarScroll } from '@/contexts/TabBarScrollContext'

/** Hides the floating tab bar while this screen is focused — restores on blur. */
export function useHideTabBarWhileFocused(): void {
  const { suppressTabBar, releaseTabBar } = useTabBarScroll()

  useFocusEffect(
    useCallback(() => {
      suppressTabBar()
      return () => {
        releaseTabBar()
      }
    }, [suppressTabBar, releaseTabBar]),
  )
}
