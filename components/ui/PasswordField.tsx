import { forwardRef, useState } from 'react'
import { Pressable, type TextInput, type TextInputProps } from 'react-native'

import { AppIcon } from '@/components/ui/AppIcon'
import { TextField } from '@/components/ui/TextField'
import { TEXT_TERTIARY } from '@/constants/brand'

type Props = TextInputProps & {
  label?: string
  error?: string | null
  borderColor?: string
}

/** {@link TextField} with secure entry and a show / hide eye. */
export const PasswordField = forwardRef<TextInput, Props>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      ref={ref}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      suffix={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
          hitSlop={6}
          className="items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <AppIcon name={visible ? 'eye-off' : 'eye'} size={18} color={TEXT_TERTIARY} />
        </Pressable>
      }
    />
  )
})
