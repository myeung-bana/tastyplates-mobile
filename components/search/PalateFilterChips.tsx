import { Pressable, Text, View } from 'react-native'
import { AppIcon } from '@/components/ui/AppIcon'

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
    <View className="flex-row flex-wrap gap-2" style={{ marginTop: -5 }}>
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
