import { Redirect, Tabs, useGlobalSearchParams, usePathname } from 'expo-router'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

import { StudioTabAnchorButton } from '@/components/studio/StudioTabAnchorButton'
import { StudioTabBarWithQuickActions } from '@/components/studio/StudioTabBarWithQuickActions'
import { SCREEN_GET_STARTED } from '@/constants/screens'
import { studioQuickMenuToggleRef } from '@/contexts/StudioQuickMenuContext'
import { useGetStartedGate } from '@/hooks/useGetStartedGate'
import { useAuth } from '@/hooks/useAuth'
import { loginScreenHref, pathnameWithQueryResume } from '@/lib/authRoutes'

const BRAND_PRIMARY = '#ff7c0a'
const TAB_INACTIVE = '#9ca3af'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name: string
  title: string
  icon: IoniconName
  iconFocused: IoniconName
}

/** Four visible tabs: Home, Restaurants, Following, Studio (+). Studio tab intercepts navigation (quick menu). */
const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    name: 'restaurants',
    title: 'Restaurants',
    icon: 'restaurant-outline',
    iconFocused: 'restaurant',
  },
  {
    name: 'following',
    title: 'Following',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  {
    name: 'studio',
    title: 'Studio',
    icon: 'add',
    iconFocused: 'add',
  },
]

export default function TabsLayout(): JSX.Element | null {
  const pathname = usePathname()
  const searchParams = useGlobalSearchParams()
  const resume = pathnameWithQueryResume(
    pathname,
    searchParams as Record<string, string | string[] | undefined>,
  )

  const { isAuthenticated, loading } = useAuth()
  const getStartedGate = useGetStartedGate()

  /** Session resolution is awaited in {@link SplashAuthGate}; defensive if state lags behind. */
  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    if (!getStartedGate.ready) {
      return null
    }
    if (resume) {
      return <Redirect href={loginScreenHref({ resume })} />
    }
    if (getStartedGate.showIntro) {
      return <Redirect href={SCREEN_GET_STARTED} />
    }
    return <Redirect href={loginScreenHref()} />
  }

  return (
    <Tabs
      tabBar={(tabBarProps) => <StudioTabBarWithQuickActions {...tabBarProps} />}
      screenOptions={{
        tabBarActiveTintColor: BRAND_PRIMARY,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
        {TABS.map(({ name, title, icon, iconFocused }) =>
          name === 'studio' ? (
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
                title,
                tabBarIcon: ({ focused, color, size }) => (
                  <Ionicons name={focused ? iconFocused : icon} size={size ?? 22} color={color} />
                ),
                tabBarButton: (props: BottomTabBarButtonProps) => <StudioTabAnchorButton {...props} />,
              }}
            />
          ) : (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title,
                tabBarIcon: ({ focused, color, size }) => (
                  <Ionicons name={focused ? iconFocused : icon} size={size ?? 22} color={color} />
                ),
              }}
            />
          ),
        )}
        {/**
         * Profile stack lives under tabs (own + public `profile/[userId]`) but has no tab button —
         * the header avatar opens the signed-in user (`/(tabs)/profile`).
         */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        {/* In-app stacks: keep `(tabs)` shell + bottom nav while pushing these routes */}
        <Tabs.Screen name="places" options={{ href: null }} />
        <Tabs.Screen name="articles" options={{ href: null }} />
        <Tabs.Screen name="reviews" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="listing" options={{ href: null }} />
        <Tabs.Screen name="hashtag" options={{ href: null }} />
    </Tabs>
  )
}
