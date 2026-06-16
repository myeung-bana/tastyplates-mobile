import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'

import { TabBarChrome } from '@/components/navigation/TabBarChrome'

/**
 * Default bottom tab bar — styling comes from `screenOptions.tabBarStyle` in {@link TabsShell}.
 * Shared by guest browse; signed-in users use {@link StudioTabBarWithQuickActions} instead.
 */
export function AppBottomTabBar(props: BottomTabBarProps): JSX.Element {
  return (
    <TabBarChrome>
      <BottomTabBar {...props} />
    </TabBarChrome>
  )
}
