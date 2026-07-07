import { useLayoutEffect } from 'react'
import { useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getTabSceneStylePaddingBottom, getTabBarStyle, TAB_BAR_BG } from '@/constants/tabBar'

function getTabNavigation(navigation: ReturnType<typeof useNavigation>) {
  return navigation.getParent()?.getParent() ?? navigation.getParent()
}

/** Hides the parent tab bar while mounted — restores on unmount. */
export function useHideTabBarWhileFocused(): void {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  useLayoutEffect(() => {
    const tab = getTabNavigation(navigation)
    if (!tab) return

    const restoredTabBarStyle = getTabBarStyle(insets)
    const restoredSceneStyle = {
      paddingBottom: getTabSceneStylePaddingBottom(insets),
      backgroundColor: TAB_BAR_BG,
    }

    tab.setOptions({
      tabBarStyle: { display: 'none' },
      sceneStyle: { paddingBottom: 0, backgroundColor: TAB_BAR_BG },
    })

    return () => {
      tab.setOptions({
        tabBarStyle: restoredTabBarStyle,
        sceneStyle: restoredSceneStyle,
      })
    }
  }, [navigation, insets.bottom])
}
