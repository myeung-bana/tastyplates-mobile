import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { SURFACE_FOG, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

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

/** Kakao-style page switcher (design P1): left-aligned pills, dark when selected. */
export function ProfileContentTabBar({ activeTab, onTabChange }: Props): JSX.Element {
  return (
    <View accessibilityRole="tablist" className="flex-row" style={{ gap: 6 }}>
      {TABS.map((tab) => {
        const on = tab.key === activeTab
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
            className="items-center justify-center active:opacity-80"
            style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? TEXT_HEADING : SURFACE_FOG }}
          >
            <Text style={{ fontFamily: on ? FONT.heading : FONT.headingMedium, fontSize: 14, letterSpacing: 0.15, color: on ? '#FFFFFF' : TEXT_MUTED }}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
