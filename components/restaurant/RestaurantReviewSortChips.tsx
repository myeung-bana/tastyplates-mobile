import { Pressable, ScrollView, Text } from 'react-native'
import * as Haptics from 'expo-haptics'

import { BORDER_SUBTLE, BRAND_PRIMARY, BRAND_PRIMARY_DARK, TEXT_MUTED } from '@/constants/brand'
import { FONT } from '@/constants/typography'

export type RestaurantReviewSortFilter = 'all' | 'asc' | 'desc' | 'highest'

/** Sort: All · Oldest · Newest · Highest rated (design R1). */
const TABS = [
  { key: 'all' as const, label: 'All' },
  { key: 'asc' as const, label: 'Oldest' },
  { key: 'desc' as const, label: 'Newest' },
  { key: 'highest' as const, label: 'Highest rated' },
]

type Props = {
  active: RestaurantReviewSortFilter
  onChange: (filter: RestaurantReviewSortFilter) => void
}

/** Content-width sort pills in a horizontal scroll (design R1). */
export function RestaurantReviewSortChips({ active, onChange }: Props): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
    >
      {TABS.map(({ key, label }) => {
        const selected = active === key
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return
              void Haptics.selectionAsync()
              onChange(key)
            }}
            className="justify-center active:opacity-80"
            style={{
              height: 36,
              paddingHorizontal: 16,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: selected ? BRAND_PRIMARY : BORDER_SUBTLE,
            }}
          >
            <Text
              style={{
                fontFamily: selected ? FONT.bodySemibold : FONT.body,
                fontSize: 14,
                color: selected ? BRAND_PRIMARY_DARK : TEXT_MUTED,
              }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
