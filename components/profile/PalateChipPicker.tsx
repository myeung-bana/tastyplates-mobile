import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  SURFACE_FOG,
  TEXT_HEADING,
  TEXT_MUTED,
  TEXT_TERTIARY,
} from '@/constants/brand'
import { palateOptions } from '@/constants/palateOptions'
import { FONT } from '@/constants/typography'
import { palateLimit } from '@/constants/validation'

export interface PalateChipPickerProps {
  selected: ReadonlySet<string>
  onToggle: (key: string) => void
  /** Case-insensitive filter on cuisine label / slug. */
  query?: string
  disabled?: boolean
}

/**
 * Cuisine chips grouped by region (design P6). Selected chips get the orange outline and a tick;
 * at the limit the rest dim and ignore taps until one is deselected.
 */
export function PalateChipPicker({ selected, onToggle, query = '', disabled = false }: PalateChipPickerProps): JSX.Element {
  const q = query.trim().toLowerCase()
  const groups = useMemo(
    () =>
      palateOptions
        .map((region) => ({
          region,
          items: region.children.filter((c) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
        }))
        .filter((g) => g.items.length > 0),
    [q],
  )
  const full = selected.size >= palateLimit

  if (groups.length === 0) {
    return (
      <Text style={{ fontFamily: FONT.body, fontSize: 14, color: TEXT_MUTED, paddingVertical: 24, textAlign: 'center' }}>
        No cuisines match “{query.trim()}”.
      </Text>
    )
  }

  return (
    <View style={{ gap: 18 }}>
      {groups.map(({ region, items }) => (
        <View key={region.key} style={{ gap: 10 }}>
          <Text style={{ fontFamily: FONT.heading, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', color: TEXT_MUTED }}>
            {region.label}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {items.map((c) => {
              const on = selected.has(c.key)
              const dim = full && !on
              return (
                <Pressable
                  key={c.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: disabled || dim }}
                  accessibilityLabel={c.label}
                  disabled={disabled || dim}
                  onPress={() => {
                    void Haptics.selectionAsync()
                    onToggle(c.key)
                  }}
                  className="flex-row items-center active:opacity-80"
                  style={{
                    height: 38,
                    paddingHorizontal: 14,
                    gap: 6,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: on ? BRAND_PRIMARY : dim ? SURFACE_FOG : BORDER_SUBTLE,
                  }}
                >
                  {on ? <AppIcon name="check" size={14} color={BRAND_PRIMARY_DARK} /> : null}
                  <Text
                    style={{
                      fontFamily: on ? FONT.bodySemibold : FONT.body,
                      fontSize: 14,
                      color: on ? BRAND_PRIMARY_DARK : dim ? TEXT_TERTIARY : TEXT_HEADING,
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}
