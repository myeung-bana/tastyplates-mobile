import type { JSX } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { View } from 'react-native'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'

import { TabBarButton } from '@/components/navigation/TabBarButton'
import { useStudioQuickMenu } from '@/contexts/StudioQuickMenuContext'

/**
 * Measures the Studio slot in window coords for the floating +/- orb positioning.
 */
export function StudioTabAnchorButton(props: BottomTabBarButtonProps): JSX.Element {
  const wrapRef = useRef<View>(null)
  const { setAnchorRect } = useStudioQuickMenu()

  const publishLayout = useCallback(() => {
    wrapRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return
      setAnchorRect({ x, y, width, height })
    })
  }, [setAnchorRect])

  useEffect(() => {
    publishLayout()
  }, [publishLayout])

  return (
    <View ref={wrapRef} collapsable={false} style={{ flex: 1 }} onLayout={publishLayout}>
      <TabBarButton {...props} />
    </View>
  )
}
