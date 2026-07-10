import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'

import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  TEXT_HEADING,
  TEXT_MUTED,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { formatBirthdateDisplay } from '@/lib/formatBirthdate'

type Props = {
  value: Date | null
  onChange: (date: Date) => void
  disabled?: boolean
  error?: boolean
  maximumDate?: Date
}

const DEFAULT_MAX_DATE = new Date()

export function BirthdateField({
  value,
  onChange,
  disabled = false,
  error = false,
  maximumDate = DEFAULT_MAX_DATE,
}: Props): JSX.Element {
  const [showPicker, setShowPicker] = useState(false)

  const display = value ? formatBirthdateDisplay(value) : 'Select date of birth'
  const placeholder = !value

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false)
    }
    if (selected) {
      onChange(selected)
    }
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        className="flex-row items-center justify-between rounded-xl border px-4 py-3 active:opacity-80"
        style={{
          borderColor: error ? '#fca5a5' : BORDER_SUBTLE,
          backgroundColor: disabled ? '#f9fafb' : '#ffffff',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text
          className="flex-1 font-neusans text-base"
          style={mergeTextInputBodyTypography({
            color: placeholder ? TEXT_MUTED : TEXT_HEADING,
          })}
        >
          {display}
        </Text>
        <AppIcon name="chevron-down" size={18} color={TEXT_MUTED} />
      </Pressable>

      {showPicker ? (
        Platform.OS === 'ios' ? (
          <View className="mt-2 overflow-hidden rounded-xl border" style={{ borderColor: BORDER_SUBTLE }}>
            <DateTimePicker
              value={value ?? maximumDate}
              mode="date"
              display="spinner"
              maximumDate={maximumDate}
              onChange={handleChange}
            />
            <Pressable
              onPress={() => setShowPicker(false)}
              className="items-center border-t py-3 active:bg-orange-50/60"
              style={{ borderColor: BORDER_SUBTLE }}
            >
              <Text className="text-base font-semibold font-neusans" style={{ color: TEXT_HEADING }}>
                Done
              </Text>
            </Pressable>
          </View>
        ) : (
          <DateTimePicker
            value={value ?? maximumDate}
            mode="date"
            display="default"
            maximumDate={maximumDate}
            onChange={handleChange}
          />
        )
      ) : null}
    </View>
  )
}
