import { Pressable, Text, View } from 'react-native'

import { BRAND_PRIMARY } from '@/constants/brand'
import { flattenPalateSlugOptions } from '@/lib/onboardingPalates'
import { palateLimit } from '@/constants/validation'

export interface PalateChipPickerProps {
  selected: Set<string>
  onToggle: (key: string) => void
  disabled?: boolean
  error?: string | null
}

export function PalateChipPicker({
  selected,
  onToggle,
  disabled = false,
  error = null,
}: PalateChipPickerProps): JSX.Element {
  const options = flattenPalateSlugOptions()
  const atLimit = selected.size >= palateLimit

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {options.map((p) => {
          const on = selected.has(p.key)
          const dim = atLimit && !on
          return (
            <Pressable
              key={p.key}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.label}
              onPress={() => onToggle(p.key)}
              className={`rounded-full border px-3 py-2 ${on ? 'border-[#ff7c0a] bg-orange-50' : 'border-gray-200 bg-white'}`}
              style={{ opacity: dim ? 0.4 : 1 }}
            >
              <Text className={`text-sm font-medium ${on ? 'text-[#ff7c0a]' : 'text-gray-800'}`}>
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {error ? (
        <Text className="mt-2 text-sm" style={{ color: BRAND_PRIMARY }}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}
