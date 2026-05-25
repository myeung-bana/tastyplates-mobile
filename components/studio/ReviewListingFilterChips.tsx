import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

export type ReviewListingFilter = 'all' | 'draft' | 'live'

const TABS: { key: ReviewListingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'live', label: 'Live' },
]

interface Props {
  active: ReviewListingFilter
  onChange: (filter: ReviewListingFilter) => void
}

/** Pill filter chips for Manage Reviews — same pattern as review-listing / Manage Lists tabs. */
export function ReviewListingFilterChips({ active, onChange }: Props): JSX.Element {
  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      {TABS.map((tab) => {
        const pressed = active === tab.key
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: pressed }}
            onPress={() => {
              void Haptics.selectionAsync()
              onChange(tab.key)
            }}
            className="rounded-full px-7 py-2"
            style={{ backgroundColor: pressed ? BRAND_PRIMARY : '#f3f4f6' }}
          >
            <Text style={{ fontWeight: '700', color: pressed ? '#ffffff' : TEXT_HEADING }}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
