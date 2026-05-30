import { useState } from 'react'
import {
  Pressable,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  View,
} from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { mergeTextInputBodyTypography, TEXT_MUTED } from '@/constants/brand'

const TOGGLE_HIT = 44

export type PasswordInputProps = TextInputProps & {
  containerClassName?: string
}

/**
 * Password field with trailing eye toggle (Feather `eye` / `eye-off` via AppIcon).
 */
export function PasswordInput({
  style,
  className,
  containerClassName,
  autoCapitalize = 'none',
  autoCorrect = false,
  ...rest
}: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false)

  const inputStyle: StyleProp<TextStyle> = [
    mergeTextInputBodyTypography(),
    { paddingRight: TOGGLE_HIT + 8 },
    style,
  ]

  return (
    <View className={containerClassName ?? 'relative'}>
      <TextInput
        {...rest}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        secureTextEntry={!visible}
        className={className}
        style={inputStyle}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={8}
        onPress={() => setVisible((v) => !v)}
        className="absolute bottom-0 right-0 top-0 items-center justify-center active:opacity-70"
        style={{ width: TOGGLE_HIT }}
      >
        <AppIcon name={visible ? 'eye-off' : 'eye'} size={20} color={TEXT_MUTED} />
      </Pressable>
    </View>
  )
}
