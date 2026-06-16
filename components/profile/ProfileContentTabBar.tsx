import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

export type ProfileContentTab = 'reviews' | 'lists'

type Props = {
  activeTab: ProfileContentTab
  onTabChange: (tab: ProfileContentTab) => void
}

const TABS: { key: ProfileContentTab; label: string }[] = [
  { key: 'reviews', label: 'Reviews' },
  { key: 'lists', label: 'Lists' },
]

export function ProfileContentTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return (
    <View className="mb-4 flex-row gap-2">
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
