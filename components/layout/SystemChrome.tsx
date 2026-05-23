import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as NavigationBar from 'expo-navigation-bar'
import * as SystemUI from 'expo-system-ui'

import { TAB_BAR_BG } from '@/constants/tabBar'

/**
 * Aligns OS chrome with the light tab bar (white background, dark Android nav buttons).
 * Mount once at the app root.
 */
export function SystemChrome(): null {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(TAB_BAR_BG)

    if (Platform.OS !== 'android') return

    void NavigationBar.setBackgroundColorAsync(TAB_BAR_BG)
    void NavigationBar.setButtonStyleAsync('dark')
  }, [])

  return null
}
