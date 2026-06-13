import { Pressable, ScrollView, Text } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BRAND_PRIMARY, TEXT_HEADING } from '@/constants/brand'

export type RestaurantReviewSortFilter = 'all' | 'asc' | 'desc' | 'highest'

const TABS: { key: RestaurantReviewSortFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'asc', label: 'ASC' },
  { key: 'desc', label: 'DESC' },
  { key: 'highest', label: 'Highest Rated' },
]

type Props = {
  active: RestaurantReviewSortFilter
  onChange: (filter: RestaurantReviewSortFilter) => void
}

/** Pill sort controls for restaurant review list. */
export function RestaurantReviewSortChips({ active, onChange }: Props): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
    >
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
            className="rounded-full px-5 py-2"
            style={{ backgroundColor: pressed ? BRAND_PRIMARY : '#f3f4f6' }}
          >
            <Text style={{ fontWeight: '700', color: pressed ? '#ffffff' : TEXT_HEADING }}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
