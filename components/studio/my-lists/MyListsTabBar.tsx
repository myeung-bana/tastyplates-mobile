import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

export type MyListsTab = 'todine' | 'checkins'

interface Props {
  activeTab: MyListsTab
  onTabChange: (tab: MyListsTab) => void
}

const TABS: { key: MyListsTab; label: string }[] = [
  { key: 'todine', label: 'To-Dine' },
  { key: 'checkins', label: 'Check-ins' },
]

/** Pill filter chips — same pattern as Manage reviews (`review-listing.tsx`). */
export function MyListsTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-2">
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
            className="rounded-full px-7 py-2"
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
