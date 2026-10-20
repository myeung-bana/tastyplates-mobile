import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BORDER_SUBTLE, BRAND_PRIMARY, TEXT_HEADING, TEXT_TERTIARY } from '@/constants/brand'
import { FONT } from '@/constants/typography'

export type ProfileConnectionsTab = 'followers' | 'following'

type Props = {
  activeTab: ProfileConnectionsTab
  onTabChange: (tab: ProfileConnectionsTab) => void
  /** Optional counts shown after the labels ("Followers 48"). */
  counts?: Partial<Record<ProfileConnectionsTab, number | null>>
}

const TABS: { key: ProfileConnectionsTab; label: string }[] = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
]

/** Underlined two-up tabs for followers / following (design P8). */
export function ProfileConnectionsTabBar({ activeTab, onTabChange, counts }: Props): JSX.Element {
  return (
    <View accessibilityRole="tablist" className="flex-row" style={{ borderBottomWidth: 1, borderBottomColor: BORDER_SUBTLE }}>
      {TABS.map((tab) => {
        const on = tab.key === activeTab
        const count = counts?.[tab.key]
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return
              void Haptics.selectionAsync()
              onTabChange(tab.key)
            }}
            className="items-center justify-center"
            style={{ flex: 1, height: 46 }}
          >
            <Text style={{ fontFamily: FONT.heading, fontSize: 14, letterSpacing: 0.5, color: on ? TEXT_HEADING : TEXT_TERTIARY }}>
              {tab.label}
              {count != null ? ` ${count}` : ''}
            </Text>
            <View
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                bottom: -1,
                height: 2,
                borderRadius: 2,
                backgroundColor: on ? BRAND_PRIMARY : 'transparent',
              }}
            />
          </Pressable>
        )
      })}
    </View>
  )
}
