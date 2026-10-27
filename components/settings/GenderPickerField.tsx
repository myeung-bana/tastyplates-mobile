import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { ModalSheet } from '@/components/ui/ModalSheet'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  BRAND_PRIMARY_DARK,
  TEXT_HEADING,
  TEXT_MUTED,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { genderLabelForValue, genderOptions } from '@/constants/formOptions'
import { FONT } from '@/constants/typography'

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
}

export function GenderPickerField({
  value,
  onChange,
  disabled = false,
  error = false,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false)

  const label = genderLabelForValue(value)
  const placeholder = !value

  const select = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border px-4 py-3 active:opacity-80"
        style={{
          borderColor: error ? '#fca5a5' : BORDER_SUBTLE,
          backgroundColor: disabled ? '#f9fafb' : '#ffffff',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text
          className="flex-1 text-base font-body"
          style={mergeTextInputBodyTypography({
            color: placeholder ? TEXT_MUTED : TEXT_HEADING,
          })}
        >
          {placeholder ? 'Select your gender' : label}
        </Text>
        <AppIcon name="chevron-down" size={18} color={TEXT_MUTED} />
      </Pressable>

      <ModalSheet visible={open} onClose={() => setOpen(false)} accessibilityLabel="Gender" contentStyle={{ paddingHorizontal: 0 }}>
        <Text accessibilityRole="header" style={{ marginTop: 6, marginBottom: 6, paddingHorizontal: 24, fontFamily: FONT.heading, fontSize: 22, color: TEXT_HEADING }}>
          Gender
        </Text>
        {genderOptions.map((option) => {
          const selected = value === option.value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => select(option.value)}
              className="flex-row items-center justify-between active:opacity-70"
              style={{ minHeight: 52, paddingHorizontal: 24 }}
            >
              <Text style={{ fontFamily: selected ? FONT.bodySemibold : FONT.body, fontSize: 16, color: selected ? BRAND_PRIMARY_DARK : TEXT_HEADING }}>
                {option.label}
              </Text>
              {selected ? <AppIcon name="check" size={20} color={BRAND_PRIMARY} /> : null}
            </Pressable>
          )
        })}
      </ModalSheet>
    </View>
  )
}
