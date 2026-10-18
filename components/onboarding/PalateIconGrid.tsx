import { useMemo } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  SURFACE_CARD,
  TEXT_HEADING,
  TEXT_MUTED,
} from '@/constants/brand'
import { palateOptions } from '@/constants/palateOptions'
import { FONT } from '@/constants/typography'
import { palateLimit } from '@/constants/validation'
import { getCuisineIconForSlug } from '@/lib/cuisineIconAssets'

type Props = {
  selected: ReadonlySet<string>
  onToggle: (key: string) => void
  /** Case-insensitive filter on cuisine label / slug. */
  query?: string
  disabled?: boolean
}

const COLUMNS = 4

/**
 * Leaf cuisines as round brand-icon tiles, grouped by region (design G7 / P6).
 * The orange ring is the selected state; at the limit, unselected tiles dim and ignore taps.
 */
export function PalateIconGrid({ selected, onToggle, query = '', disabled = false }: Props): JSX.Element {
  const q = query.trim().toLowerCase()
  const groups = useMemo(
    () =>
      palateOptions
        .map((region) => ({
          region,
          items: region.children.filter(
            (c) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q),
          ),
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
    <View style={{ gap: 22 }}>
      {groups.map(({ region, items }) => (
        <View key={region.key} style={{ gap: 14 }}>
          <Text
            style={{
              fontFamily: FONT.heading,
              fontSize: 11,
              lineHeight: 14,
              letterSpacing: 2.2,
              textTransform: 'uppercase',
              color: TEXT_MUTED,
            }}
          >
            {region.label}
          </Text>
          <View className="flex-row flex-wrap" style={{ rowGap: 18 }}>
            {items.map((c) => {
              const on = selected.has(c.key)
              const dim = full && !on
              const icon = getCuisineIconForSlug(c.key, region.key)
              return (
                <Pressable
                  key={c.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: disabled || dim }}
                  accessibilityLabel={c.label}
                  disabled={disabled}
                  onPress={() => {
                    if (dim) return
                    void Haptics.selectionAsync()
                    onToggle(c.key)
                  }}
                  className="items-center"
                  style={{ width: `${100 / COLUMNS}%`, gap: 8, opacity: dim ? 0.45 : 1 }}
                >
                  <View
                    className="items-center justify-center"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      borderWidth: on ? 2.5 : 2,
                      borderColor: on ? BRAND_PRIMARY : BORDER_SUBTLE,
                      backgroundColor: SURFACE_CARD,
                    }}
                  >
                    {icon ? (
                      <Image source={icon} style={{ width: 34, height: 34 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontFamily: FONT.heading, fontSize: 20, color: on ? BRAND_PRIMARY : TEXT_HEADING }}>
                        {c.label[0]}
                      </Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={2}
                    className="text-center"
                    style={{
                      fontFamily: FONT.heading,
                      fontSize: 10,
                      lineHeight: 12,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      color: on ? BRAND_PRIMARY_DARK : TEXT_MUTED,
                      paddingHorizontal: 2,
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
