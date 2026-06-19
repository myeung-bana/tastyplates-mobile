import { Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'
import { isNoCuisineFilter } from '@/lib/palateSearch'

export type PalateFilterChipsProps = {
  cuisine: string | null | undefined
  searchQuery: string | null | undefined
  onClearCuisine: () => void
  onClearSearch: () => void
  isPersonalised?: boolean
}

/**
 * Active cuisine / text filters on the Restaurants tab.
 */
export function PalateFilterChips({
  cuisine,
  searchQuery,
  onClearCuisine,
  onClearSearch,
  isPersonalised = false,
}: PalateFilterChipsProps): JSX.Element | null {
  const showCuisine = !isNoCuisineFilter(cuisine)
  const showSearch = Boolean(searchQuery?.trim())

  if (!showCuisine && !showSearch) return null

  return (
    <View>
      <View className="flex-row flex-wrap gap-2" style={{ marginTop: -5 }}>
        {showCuisine ? (
          <FilterChip
            label={labelForPalateKey(cuisine ?? null)}
            onDismiss={onClearCuisine}
          />
        ) : null}
        {showSearch ? (
          <FilterChip label={`Search: ${searchQuery!.trim()}`} onDismiss={onClearSearch} />
        ) : null}
      </View>
      {isPersonalised ? (
        <Text className="mt-1.5 font-neusans text-[11px]" style={{ color: BRAND_PRIMARY }}>
          ✦ Ranked for your palate
        </Text>
      ) : null}
    </View>
  )
}

function FilterChip({ label, onDismiss }: { label: string; onDismiss: () => void }): JSX.Element {
  return (
    <View className="flex-row items-center gap-2 rounded-[50px] border border-gray-300 bg-white pl-4 pr-2 py-2">
      <Text
        className="max-w-[200px] font-neusans text-sm font-normal text-gray-900"
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        hitSlop={8}
        onPress={onDismiss}
        className="rounded-full p-0.5 active:opacity-70"
      >
        <AppIcon name="x" size="sm" color="#6b7280" />
      </Pressable>
    </View>
  )
}
