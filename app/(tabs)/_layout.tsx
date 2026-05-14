import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const BRAND_PRIMARY = '#ff7c0a'
const TAB_INACTIVE = '#9ca3af'
const TAB_BG = '#ffffff'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name: string
  title: string
  icon: IoniconName
  iconFocused: IoniconName
}

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
    icon: 'add-circle-outline',
    iconFocused: 'add-circle',
  },
  {
    name: 'profile',
    title: 'Profile',
    icon: 'person-outline',
    iconFocused: 'person',
  },
]

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND_PRIMARY,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          paddingBottom: 20,
          paddingTop: 4,
          height: 76,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      {TABS.map(({ name, title, icon, iconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? iconFocused : icon}
                size={size ?? 24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
