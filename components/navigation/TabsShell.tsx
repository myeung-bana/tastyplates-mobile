import { Tabs } from 'expo-router'
import { useCallback, useMemo } from 'react'
import type { BottomTabBarButtonProps, BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { getTabBarHeight, getTabBarStyle, TAB_BAR_BG } from '@/constants/tabBar'
import { BRAND_PRIMARY, NAV_ICON } from '@/constants/brand'
import { AppBottomTabBar } from '@/components/navigation/AppBottomTabBar'
import { TabBarButton } from '@/components/navigation/TabBarButton'
import { StudioTabAnchorButton } from '@/components/studio/StudioTabAnchorButton'
import { StudioTabBarWithQuickActions } from '@/components/studio/StudioTabBarWithQuickActions'
import { SCREEN_PROFILE } from '@/constants/screens'
import { useAuthSheet } from '@/contexts/AuthSheetContext'
import { studioQuickMenuToggleRef } from '@/contexts/StudioQuickMenuContext'

const TAB_INACTIVE = NAV_ICON

export interface TabConfig {
  name: string
  title: string
  icon: AppIconName
}

type TabsShellProps = {
  visibleTabs: TabConfig[]
  /** When true, show Studio (+) quick-menu tab bar; guests use the default bar. */
  useStudioTabBar?: boolean
}

const TAB_CONFIG_BY_NAME: Record<string, TabConfig> = {
  index: { name: 'index', title: 'Home', icon: 'home' },
  restaurants: { name: 'restaurants', title: 'Explore', icon: 'compass' },
  following: { name: 'following', title: 'Activity', icon: 'bell' },
  studio: { name: 'studio', title: 'Studio', icon: 'plus-square' },
  profile: { name: 'profile', title: 'Profile', icon: 'user' },
}

const MAIN_TAB_NAMES = ['index', 'restaurants', 'following', 'studio', 'profile'] as const

function tabBarIcon(config: TabConfig) {
  return ({
    focused,
    color,
    size,
  }: {
    focused: boolean
    color: string
    size: number
  }) => (
    <AppIcon
      name={config.icon}
      active={focused}
      size={size ?? 22}
      color={color}
    />
  )
}

/**
 * Shared tab navigator — visible tab set differs for signed-in vs guest browse.
 */
function renderTabBarButton(props: BottomTabBarButtonProps): JSX.Element {
  return <TabBarButton {...props} />
}

export function TabsShell({ visibleTabs, useStudioTabBar = false }: TabsShellProps): JSX.Element {
  const visibleNames = new Set(visibleTabs.map((t) => t.name))
  const insets = useSafeAreaInsets()
  const { openAuthSheet } = useAuthSheet()
  const tabBarStyle = useMemo(() => getTabBarStyle(insets), [insets.bottom])
  const sceneStyle = useMemo(
    () => ({
      paddingBottom: getTabBarHeight(insets),
      backgroundColor: TAB_BAR_BG,
    }),
    [insets.bottom],
  )

  const renderTabBar = useCallback(
    (tabBarProps: BottomTabBarProps) =>
      useStudioTabBar ? (
        <StudioTabBarWithQuickActions {...tabBarProps} />
      ) : (
        <AppBottomTabBar {...tabBarProps} />
      ),
    [useStudioTabBar],
  )

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: BRAND_PRIMARY,
      tabBarInactiveTintColor: TAB_INACTIVE,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '500',
      },
      tabBarStyle,
      sceneStyle,
      tabBarButton: renderTabBarButton,
      headerShown: false,
    }),
    [tabBarStyle, sceneStyle],
  )

  return (
    <Tabs tabBar={renderTabBar} screenOptions={screenOptions}>
      {MAIN_TAB_NAMES.map((name) => {
        const config = TAB_CONFIG_BY_NAME[name]
        const showInBar = visibleNames.has(name)

        if (name === 'studio' && showInBar) {
          return (
            <Tabs.Screen
              key={name}
              name={name}
              listeners={{
                tabPress: (e) => {
                  e.preventDefault()
                  studioQuickMenuToggleRef.current?.()
                },
              }}
              options={{
                title: config.title,
                tabBarIcon: tabBarIcon(config),
                tabBarButton: (props: BottomTabBarButtonProps) => (
                  <StudioTabAnchorButton {...props} />
                ),
              }}
            />
          )
        }

        if (name === 'restaurants' && showInBar) {
          return (
            <Tabs.Screen
              key={name}
              name={name}
              listeners={({ navigation }) => ({
                tabPress: () => {
                  navigation.navigate('restaurants', { screen: 'index' })
                },
              })}
              options={{
                title: config.title,
                tabBarIcon: tabBarIcon(config),
              }}
            />
          )
        }

        if (name === 'profile' && showInBar && !useStudioTabBar) {
          return (
            <Tabs.Screen
              key={name}
              name={name}
              listeners={{
                tabPress: (e) => {
                  e.preventDefault()
                  openAuthSheet({ mode: 'signin', resume: SCREEN_PROFILE })
                },
              }}
              options={{
                title: config.title,
                tabBarIcon: tabBarIcon(config),
              }}
            />
          )
        }

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: config.title,
              href: showInBar ? undefined : null,
              tabBarIcon: tabBarIcon(config),
            }}
          />
        )
      })}
      <Tabs.Screen name="places" options={{ href: null }} />
      <Tabs.Screen name="articles" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="listing" options={{ href: null }} />
      <Tabs.Screen name="hashtag" options={{ href: null }} />
    </Tabs>
  )
}

/** Signed-in bottom nav: Home, Explore, Activity, Studio (+). Profile via header avatar. */
export const AUTH_VISIBLE_TABS: TabConfig[] = [
  TAB_CONFIG_BY_NAME.index,
  TAB_CONFIG_BY_NAME.restaurants,
  TAB_CONFIG_BY_NAME.following,
  TAB_CONFIG_BY_NAME.studio,
]

/** Guest browse: Home, Explore, Profile. */
export const GUEST_VISIBLE_TABS: TabConfig[] = [
  TAB_CONFIG_BY_NAME.index,
  TAB_CONFIG_BY_NAME.restaurants,
  TAB_CONFIG_BY_NAME.profile,
]
