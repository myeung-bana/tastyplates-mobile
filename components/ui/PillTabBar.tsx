import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  SURFACE_CARD,
  TEXT_MUTED,
} from '@/constants/brand'
import { FONT } from '@/constants/typography'

export type PillTab<T extends string> = {
  key: T
  label: string
  icon?: AppIconName
  /** Show icon instead of label text (`label` still used for accessibility). */
  iconOnly?: boolean
}

export type PillTabBarProps<T extends string> = {
  tabs: PillTab<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  /** Optional wrapper classes (e.g. `mt-4`). */
  className?: string
}

/**
 * Segmented pill tabs (brand v1.0, design L1 / M1 / P1): equal-width outlined pills,
 * orange outline + dark-orange Jost label when selected.
 */
export function PillTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PillTabBarProps<T>): JSX.Element {
  return (
    <View accessibilityRole="tablist" className={`flex-row${className ? ` ${className}` : ''}`} style={{ gap: 8 }}>
      {tabs.map(({ key, label, icon, iconOnly }) => {
        const selected = activeTab === key
        const color = selected ? BRAND_PRIMARY_DARK : TEXT_MUTED
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                void Haptics.selectionAsync()
                onTabChange(key)
              }
            }}
            className="items-center justify-center active:opacity-80"
            style={{
              flex: 1,
              height: 38,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: selected ? BRAND_PRIMARY : BORDER_SUBTLE,
              backgroundColor: SURFACE_CARD,
              paddingHorizontal: 10,
            }}
          >
            {iconOnly && icon ? (
              <AppIcon name={icon} size={18} color={color} />
            ) : (
              <Text numberOfLines={1} style={{ fontFamily: selected ? FONT.heading : FONT.headingMedium, fontSize: 14, color }}>
                {label}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
