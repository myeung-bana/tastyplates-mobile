import { Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

import { BRAND_PRIMARY } from '@/constants/brand'
import { labelForPalateKey } from '@/lib/palateLabels'
import { isNoPalateFilter } from '@/lib/palateSearch'

export type PalateFilterChipsProps = {
  palate: string | null | undefined
  searchQuery: string | null | undefined
  onClearPalate: () => void
  onClearSearch: () => void
}

/**
 * Active palate / text filters on the Restaurants tab.
 */
export function PalateFilterChips({
  palate,
  searchQuery,
  onClearPalate,
  onClearSearch,
}: PalateFilterChipsProps): JSX.Element | null {
  const showPalate = !isNoPalateFilter(palate)
  const showSearch = Boolean(searchQuery?.trim())

  if (!showPalate && !showSearch) return null

  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {showPalate ? (
        <FilterChip
          label={`Palate: ${labelForPalateKey(palate ?? null)}`}
          onDismiss={onClearPalate}
        />
      ) : null}
      {showSearch ? (
        <FilterChip label={`Search: ${searchQuery!.trim()}`} onDismiss={onClearSearch} />
      ) : null}
    </View>
  )
}

function FilterChip({ label, onDismiss }: { label: string; onDismiss: () => void }): JSX.Element {
  return (
    <View className="flex-row items-center rounded-full border border-orange-100 bg-orange-50/90 pl-3 pr-1 py-1.5">
      <Text className="max-w-[200px] text-xs text-gray-800" numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        hitSlop={8}
        onPress={onDismiss}
        className="ml-1 rounded-full p-1 active:opacity-70"
      >
        <AppIcon name="x-circle" size={18} color={BRAND_PRIMARY} />
      </Pressable>
    </View>
  )
}
