import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'
import { BRAND_PRIMARY, BORDER_OUTLINE, TEXT_HEADING } from '@/constants/brand'

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

/** Standard pill tabs — orange active fill, white inactive with outline border. */
export function PillTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PillTabBarProps<T>): JSX.Element {
  return (
    <View className={`flex-row flex-wrap gap-2${className ? ` ${className}` : ''}`}>
      {tabs.map(({ key, label, icon, iconOnly }) => {
        const pressed = activeTab === key
        const contentColor = pressed ? '#ffffff' : TEXT_HEADING
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={iconOnly ? label : undefined}
            accessibilityState={{ selected: pressed }}
            onPress={() => {
              if (!pressed) {
                void Haptics.selectionAsync()
                onTabChange(key)
              }
            }}
            className={`rounded-full py-2 ${iconOnly ? 'px-4' : 'px-7'}`}
            style={
              pressed
                ? { backgroundColor: BRAND_PRIMARY, borderWidth: 1, borderColor: BRAND_PRIMARY }
                : { backgroundColor: '#ffffff', borderWidth: 1, borderColor: BORDER_OUTLINE }
            }
          >
            {iconOnly && icon ? (
              <AppIcon name={icon} size={18} color={contentColor} />
            ) : (
              <Text
                style={{
                  fontWeight: pressed ? '700' : '400',
                  color: contentColor,
                }}
              >
                {label}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
