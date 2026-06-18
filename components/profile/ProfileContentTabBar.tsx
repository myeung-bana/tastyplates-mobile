import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, BORDER_SUBTLE, TEXT_HEADING } from '@/constants/brand'

export type ProfileContentTab = 'me' | 'reviews' | 'lists'

type Props = {
  activeTab: ProfileContentTab
  onTabChange: (tab: ProfileContentTab) => void
}

const TABS: { key: ProfileContentTab; label: string }[] = [
  { key: 'me', label: 'Me' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'lists', label: 'Lists' },
]

/** Pill section tabs — same pattern as Manage Lists / review filter chips. */
export function ProfileContentTabBar({ activeTab, onTabChange }: Props): JSX.Element {
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
            style={
              pressed
                ? { backgroundColor: BRAND_PRIMARY, borderWidth: 1, borderColor: BRAND_PRIMARY }
                : { backgroundColor: '#ffffff', borderWidth: 1, borderColor: BORDER_SUBTLE }
            }
          >
            <Text
              style={{
                fontWeight: pressed ? '700' : '400',
                color: pressed ? '#ffffff' : TEXT_HEADING,
              }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
