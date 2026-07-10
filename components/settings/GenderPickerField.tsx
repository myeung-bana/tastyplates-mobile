import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppIcon } from '@/components/ui/AppIcon'
import {
  BORDER_SUBTLE,
  BRAND_PRIMARY,
  TEXT_HEADING,
  TEXT_MUTED,
  mergeTextInputBodyTypography,
} from '@/constants/brand'
import { genderLabelForValue, genderOptions } from '@/constants/formOptions'

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
  const insets = useSafeAreaInsets()
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
          className="flex-1 font-neusans text-base"
          style={mergeTextInputBodyTypography({
            color: placeholder ? TEXT_MUTED : TEXT_HEADING,
          })}
        >
          {placeholder ? 'Select your gender' : label}
        </Text>
        <AppIcon name="chevron-down" size={18} color={TEXT_MUTED} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable
            className="rounded-t-2xl bg-white"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center border-b py-3" style={{ borderColor: BORDER_SUBTLE }}>
              <Text className="text-base font-semibold font-neusans" style={{ color: TEXT_HEADING }}>
                Gender
              </Text>
            </View>
            {genderOptions.map((option) => {
              const selected = value === option.value
              return (
                <Pressable
                  key={option.value}
                  onPress={() => select(option.value)}
                  className="flex-row items-center justify-between px-5 py-4 active:bg-orange-50/60"
                >
                  <Text
                    className="text-base font-neusans"
                    style={{ color: selected ? BRAND_PRIMARY : TEXT_HEADING }}
                  >
                    {option.label}
                  </Text>
                  {selected ? <AppIcon name="check" size={20} color={BRAND_PRIMARY} /> : null}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
