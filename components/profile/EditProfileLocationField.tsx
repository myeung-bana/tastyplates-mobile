import { Pressable, Text, View } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { BORDER_SUBTLE, TEXT_BODY, TEXT_HEADING, TEXT_MUTED } from '@/constants/brand'

export type EditProfileLocationFieldProps = {
  label: string
  helper?: string
  valueLabel: string | null
  placeholder?: string
  onPress: () => void
  disabled?: boolean
}

export function EditProfileLocationField({
  label,
  helper,
  valueLabel,
  placeholder = 'Select a city',
  onPress,
  disabled = false,
}: EditProfileLocationFieldProps): JSX.Element {
  const hasValue = Boolean(valueLabel?.trim())

  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-medium" style={{ color: TEXT_HEADING }}>
        {label}
      </Text>
      {helper ? (
        <Text className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          {helper}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${hasValue ? valueLabel : placeholder}`}
        onPress={onPress}
        disabled={disabled}
        className="active:opacity-90"
      >
        <View
          className="min-h-[48px] flex-row items-center justify-between rounded-xl border px-4 py-3"
          style={{ borderColor: BORDER_SUBTLE }}
        >
          <Text
            className="flex-1 text-base"
            style={{ color: hasValue ? TEXT_BODY : TEXT_MUTED }}
            numberOfLines={1}
          >
            {hasValue ? valueLabel : placeholder}
          </Text>
          <AppIcon name="chevron-right" size={20} color={TEXT_MUTED} />
        </View>
      </Pressable>
    </View>
  )
}
