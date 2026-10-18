import type { JSX } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { View } from 'react-native'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated'

import { TabBarButton } from '@/components/navigation/TabBarButton'
import { BORDER_SUBTLE } from '@/constants/brand'
import { useStudioQuickMenu } from '@/contexts/StudioQuickMenuContext'
import { useTabBarScrollOptional } from '@/contexts/TabBarScrollContext'

/**
 * Measures the Studio slot in window coords for the floating +/- orb positioning.
 */
export function StudioTabAnchorButton(props: BottomTabBarButtonProps): JSX.Element {
  const wrapRef = useRef<View>(null)
  const { setAnchorRect } = useStudioQuickMenu()
  const tabBarScroll = useTabBarScrollOptional()

  const publishLayout = useCallback(() => {
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return
      setAnchorRect({ x, y, width, height })
    })
  }, [setAnchorRect])

  useEffect(() => {
    publishLayout()
  }, [publishLayout])

  useAnimatedReaction(
    () => tabBarScroll?.collapseProgress.value ?? 1,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(publishLayout)()
      }
    },
  )

  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      {/* Hairline between the three tabs and the Studio + (design H1). */}
      <View style={{ width: 1, height: 24, backgroundColor: BORDER_SUBTLE, marginHorizontal: 4 }} />
      <View ref={wrapRef} collapsable={false} style={{ flex: 1, alignSelf: 'stretch' }} onLayout={publishLayout}>
        <TabBarButton {...props} />
      </View>
    </View>
  )
}
