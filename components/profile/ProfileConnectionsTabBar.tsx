import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

export type ProfileConnectionsTab = 'followers' | 'following'

type Props = {
  activeTab: ProfileConnectionsTab
  onTabChange: (tab: ProfileConnectionsTab) => void
}

const TABS: { key: ProfileConnectionsTab; label: string }[] = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
]

export function ProfileConnectionsTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return (
    <View className="flex-row gap-2 px-4 pb-3 pt-1">
      {TABS.map(({ key, label }) => {
        const pressed = activeTab === key
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: pressed }}
            onPress={() => {
              if (!pressed) {
                void Haptics.selectionAsync()
                onTabChange(key)
              }
            }}
            className="flex-1 items-center rounded-full py-2.5"
            style={{ backgroundColor: pressed ? BRAND_PRIMARY : '#f3f4f6' }}
          >
            <Text style={{ fontWeight: '700', color: pressed ? '#ffffff' : TEXT_HEADING }}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
