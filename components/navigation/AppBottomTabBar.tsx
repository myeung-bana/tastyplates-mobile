import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'

import { FloatingTabBarPill } from '@/components/navigation/FloatingTabBarPill'

/**
 * Default bottom tab bar — styling comes from `screenOptions.tabBarStyle` in {@link TabsShell}.
 * Shared by guest browse; signed-in users use {@link StudioTabBarWithQuickActions} instead.
 */
export function AppBottomTabBar(props: BottomTabBarProps): JSX.Element {
  return (
    <FloatingTabBarPill insets={props.insets}>
      <BottomTabBar {...props} />
    </FloatingTabBarPill>
  )
}
